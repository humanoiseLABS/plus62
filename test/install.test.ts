import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { install, uninstall, doctor, update } from '../src/install.ts';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

const sourceRoot = process.cwd();

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), 'hahahah-install-'));
}

const originalClaude = '# Project notes\n\nKeep this line.\n';

test('installs a managed block and skill while preserving user content', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    const result = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(result.manifest.schema, 'hahahah.install/v1');
    assert.equal(result.manifest.adapter, 'claude-code');

    const claude = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /Keep this line\./);
    assert.match(claude, /<!-- hahahah:begin profile=plus62 version=0\.1\.0 -->/);
    assert.match(claude, /\+62 Mode/);
    assert.match(claude, /<!-- hahahah:end -->/);

    assert.ok(existsSync(join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md')));
    assert.ok(existsSync(join(targetRoot, '.plus62/manifest.json')));
    assert.equal(doctor({ targetRoot }).ok, true);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('dry-run plans without writing', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62', dryRun: true });
    assert.deepEqual(readdirSync(targetRoot), []);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('reinstall keeps generated files stable and doctor detects corruption', () => {
  const targetRoot = tempProject();
  try {
    const first = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const claudeFirst = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    const skillPath = join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md');
    const skillFirst = readFileSync(skillPath, 'utf8');

    const second = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8'), claudeFirst);
    assert.equal(readFileSync(skillPath, 'utf8'), skillFirst);
    assert.deepEqual(
      first.manifest.files.map((file) => file.sha256),
      second.manifest.files.map((file) => file.sha256),
    );

    writeFileSync(skillPath, 'broken\n');
    const report = doctor({ targetRoot });
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((error) => /hash|mismatch/i.test(error)));
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('update refreshes managed block and files using the existing manifest', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(doctor({ targetRoot }).ok, true);

    const updateResult = update({ sourceRoot, targetRoot });
    assert.equal(updateResult.manifest.profile, 'plus62');
    assert.equal(updateResult.manifest.adapter, 'claude-code');
    assert.equal(doctor({ targetRoot }).ok, true);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall removes managed content and preserves user files', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const skillPath = join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md');
    assert.ok(existsSync(skillPath));

    uninstall({ targetRoot });

    const claude = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    assert.equal(claude, originalClaude);
    assert.equal(existsSync(skillPath), false);
    assert.equal(existsSync(join(targetRoot, '.plus62/manifest.json')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('every MVP profile installs and uninstalls through the same path', () => {
  const cases: Array<[string, string]> = [['plus62', 'plus62']];
  for (const [profileId, persona] of cases) {
    const targetRoot = tempProject();
    try {
      const result = install({ sourceRoot, targetRoot, profileId });
      assert.equal(result.manifest.persona, persona);
      const skillPath = join(targetRoot, `.claude/skills/hahahah-${persona}/SKILL.md`);
      assert.ok(existsSync(skillPath), `${profileId}: missing SKILL.md`);
      assert.ok(
        existsSync(
          join(targetRoot, `.claude/skills/hahahah-${persona}/references/core/10-safety.md`),
        ),
        `${profileId}: missing core safety reference`,
      );
      assert.equal(doctor({ targetRoot }).ok, true, `${profileId}: doctor failed`);
      uninstall({ targetRoot });
      assert.equal(existsSync(join(targetRoot, '.claude')), false, `${profileId}: .claude residue`);
      assert.equal(
        existsSync(join(targetRoot, 'CLAUDE.md')),
        false,
        `${profileId}: CLAUDE.md residue`,
      );
    } finally {
      rmSync(targetRoot, { recursive: true, force: true });
    }
  }
});

test('uninstall leaves no empty managed directories behind', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.ok(existsSync(join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md')));

    uninstall({ targetRoot });

    const residue: string[] = [];
    const walk = (dir: string, depth: number) => {
      if (depth > 3) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        residue.push(entry.isDirectory() ? `${path}/` : path);
        if (entry.isDirectory()) walk(path, depth + 1);
      }
    };
    walk(targetRoot, 0);
    assert.deepEqual(residue, []);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall keeps a pre-existing .claude that holds user files', () => {
  const targetRoot = tempProject();
  try {
    mkdirSync(join(targetRoot, '.claude'), { recursive: true });
    writeFileSync(join(targetRoot, '.claude/settings.local.json'), '{"keep":true}\n');
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    uninstall({ targetRoot });
    assert.equal(existsSync(join(targetRoot, '.claude/settings.local.json')), true);
    assert.equal(existsSync(join(targetRoot, '.claude/skills')), false);
    assert.equal(existsSync(join(targetRoot, 'CLAUDE.md')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall removes a CLAUDE.md it created when nothing else remains', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.ok(existsSync(join(targetRoot, 'CLAUDE.md')));
    uninstall({ targetRoot });
    assert.equal(existsSync(join(targetRoot, 'CLAUDE.md')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('modified managed block requires force to replace', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const claudePath = join(targetRoot, 'CLAUDE.md');
    const claude = readFileSync(claudePath, 'utf8').replace('+62 Mode', 'EDITED');
    writeFileSync(claudePath, claude);

    assert.throws(
      () => install({ sourceRoot, targetRoot, profileId: 'plus62' }),
      /force|modified/i,
    );
    assert.doesNotThrow(() =>
      install({ sourceRoot, targetRoot, profileId: 'plus62', force: true }),
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('refuses to overwrite an unmanaged skill file', () => {
  const targetRoot = tempProject();
  try {
    const skillDir = join(targetRoot, '.claude/skills/hahahah-plus62');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), 'user file\n');
    assert.throws(
      () => install({ sourceRoot, targetRoot, profileId: 'plus62' }),
      /force|unmanaged|exists/i,
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('update prunes stale manifest files from legacy rule layouts while keeping user rules', () => {
  const targetRoot = tempProject();
  try {
    const rulesDir = join(targetRoot, '.agents/rules');
    const userRulePath = join(rulesDir, 'projectego-android-ui.md');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(userRulePath, '# keep custom android rule\n', 'utf8');

    install({ sourceRoot, targetRoot, profileId: 'plus62', adapterId: 'antigravity' });

    const legacyDir = join(rulesDir, 'hahahah-plus62-culture-id');
    const legacyRel = '.agents/rules/hahahah-plus62-culture-id/genz-lexicon.yaml';
    const legacyAbs = join(targetRoot, legacyRel);
    const legacyContent = 'stale rule\n';
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(legacyAbs, legacyContent, 'utf8');

    // Also simulate a managed file upgraded from an older shipped version whose on-disk hash still
    // matches the installed manifest (not user-modified): unforced update() must upgrade cleanly.
    const voiceRel = '.agents/rules/hahahah-plus62-voice.md';
    const voiceAbs = join(targetRoot, voiceRel);
    const previousVoiceContent = '# old voice release\n';
    writeFileSync(voiceAbs, previousVoiceContent, 'utf8');

    const manifestPath = join(targetRoot, '.plus62/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: Array<{ path: string; sha256: string; tokens: number }>;
    };
    const voiceEntry = manifest.files.find((f) => f.path === voiceRel);
    assert.ok(voiceEntry);
    voiceEntry.sha256 = sha256(previousVoiceContent);
    manifest.files.push({ path: legacyRel, sha256: sha256(legacyContent), tokens: 10 });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    update({ sourceRoot, targetRoot });

    assert.equal(existsSync(legacyAbs), false, 'unmodified stale manifest file must be removed');
    assert.equal(existsSync(legacyDir), false, 'empty legacy nested folder must be pruned');
    assert.equal(
      existsSync(join(rulesDir, 'hahahah-plus62-culture-id-genz-lexicon.md')),
      true,
      'flat .md culture rule must exist after update',
    );
    assert.equal(readFileSync(userRulePath, 'utf8'), '# keep custom android rule\n');
    assert.equal(doctor({ targetRoot }).ok, true);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('update preserves modified stale files and rejects modified kept files unless forced', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62', adapterId: 'antigravity' });

    const voiceRel = '.agents/rules/hahahah-plus62-voice.md';
    const voiceAbs = join(targetRoot, voiceRel);
    const originalVoice = readFileSync(voiceAbs, 'utf8');
    writeFileSync(voiceAbs, `${originalVoice}\n# user local customization\n`, 'utf8');

    assert.throws(
      () => update({ sourceRoot, targetRoot }),
      /force|modified/i,
      'unforced update must refuse to overwrite a user-modified managed file',
    );

    // Restore active file to match manifest while leaving a user-edited stale manifest file behind.
    writeFileSync(voiceAbs, originalVoice, 'utf8');
    const staleRel = '.agents/rules/hahahah-plus62-culture-id/memes.yaml';
    const staleAbs = join(targetRoot, staleRel);
    mkdirSync(join(targetRoot, '.agents/rules/hahahah-plus62-culture-id'), { recursive: true });
    writeFileSync(staleAbs, '# user edited before removal\n', 'utf8');

    const manifestPath = join(targetRoot, '.plus62/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: Array<{ path: string; sha256: string; tokens: number }>;
    };
    manifest.files.push({ path: staleRel, sha256: sha256('# shipped original\n'), tokens: 8 });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    update({ sourceRoot, targetRoot });
    assert.equal(
      existsSync(staleAbs),
      true,
      'unforced update must preserve user-modified stale manifest file',
    );

    // Put the stale entry back so update --force can clean it explicitly.
    const nextManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: Array<{ path: string; sha256: string; tokens: number }>;
    };
    nextManifest.files.push({ path: staleRel, sha256: sha256('# shipped original\n'), tokens: 8 });
    writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');

    update({ sourceRoot, targetRoot, force: true });
    assert.equal(
      existsSync(staleAbs),
      false,
      'forced update must prune stale manifest file even if modified',
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('install, doctor, update, and uninstall coexist cleanly with companion anti-yapping / token-maxxing installs', () => {
  const targetRoot = tempProject();
  try {
    const antiYappingBlock = [
      '<!-- hahahah:begin profile=anti-yapping version=0.2.4 -->',
      '# Anti-Yapping core',
      'Mesin efisiensi: surgical diffs.',
      '<!-- hahahah:end -->',
      '',
    ].join('\n');
    const companionSkill = join(targetRoot, '.claude/skills/hahahah-terse/SKILL.md');
    const companionGraph = join(targetRoot, '.hahahah/graph/INDEX.md');
    const companionManifestPath = join(targetRoot, '.hahahah/manifest.json');
    const companionIgnore = '# token-maxxing: input token saver\nnode_modules/\n';

    mkdirSync(join(targetRoot, '.claude/skills/hahahah-terse'), { recursive: true });
    mkdirSync(join(targetRoot, '.hahahah/graph'), { recursive: true });
    writeFileSync(join(targetRoot, 'AGENTS.md'), antiYappingBlock, 'utf8');
    writeFileSync(companionSkill, '# terse skill\n', 'utf8');
    writeFileSync(companionGraph, '# graph index\n', 'utf8');
    writeFileSync(join(targetRoot, '.agentignore'), companionIgnore, 'utf8');
    writeFileSync(
      companionManifestPath,
      JSON.stringify(
        {
          schema: 'hahahah.install/v1',
          generated_by: 'hahahah@0.2.13',
          profile: 'anti-yapping',
          persona: 'terse',
          adapter: 'opencode',
          installed_at: '2026-11-10T04:44:21.739Z',
          files: [
            {
              path: '.claude/skills/hahahah-terse/SKILL.md',
              sha256: sha256('# terse skill\n'),
              tokens: 3,
            },
          ],
          block: { path: 'AGENTS.md', sha256: sha256(antiYappingBlock.trimEnd()) },
          created_claude_md: false,
        },
        null,
        2,
      ),
      'utf8',
    );

    const installed = install({
      sourceRoot,
      targetRoot,
      profileId: 'plus62',
      adapterId: 'opencode',
    });
    assert.equal(installed.manifest.profile, 'plus62');
    assert.equal(doctor({ targetRoot }).ok, true);

    const agentsAfterInstall = readFileSync(join(targetRoot, 'AGENTS.md'), 'utf8');
    assert.ok(
      agentsAfterInstall.includes(antiYappingBlock.trimEnd()),
      'anti-yapping block must stay intact',
    );
    assert.match(agentsAfterInstall, /<!-- hahahah:begin profile=plus62/);
    assert.equal(existsSync(companionSkill), true, 'companion terse skill must not be pruned');
    assert.equal(existsSync(companionManifestPath), true, 'companion manifest must stay intact');

    assert.equal(update({ sourceRoot, targetRoot }).manifest.profile, 'plus62');
    assert.equal(doctor({ targetRoot }).ok, true);

    uninstall({ targetRoot });
    const agentsAfterUninstall = readFileSync(join(targetRoot, 'AGENTS.md'), 'utf8');
    assert.equal(agentsAfterUninstall, antiYappingBlock);
    assert.equal(existsSync(companionSkill), true);
    assert.equal(existsSync(companionGraph), true, 'companion code graph must stay intact');
    assert.equal(existsSync(companionManifestPath), true);
    assert.equal(readFileSync(join(targetRoot, '.agentignore'), 'utf8'), companionIgnore);
    assert.equal(existsSync(join(targetRoot, '.plus62/manifest.json')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});
