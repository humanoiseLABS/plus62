import type { Artifact } from '../types.ts';
import type { Adapter, AdapterInput } from './adapter.ts';
import type { HarnessSpec } from '../harnesses.ts';

// One renderer for every harness. What differs between agents is *where files go and how the
// target opens its detailed layer*, and that is exactly what HarnessSpec records — so the
// differences live in data and this file stays a single pass over three layouts.
//
// `block` is byte-compatible with the hand-written adapters this replaces, because the managed
// block hash is stored in every install manifest: changing it would make existing installs look
// tampered.

function marker(input: AdapterInput): string {
  return `<!-- hahahah:begin profile=${input.profile.id} version=${input.persona.version} -->`;
}

function block(parts: string[]): string {
  return `${parts.join('\n')}\n`;
}

function flatRulePath(
  root: string | null,
  skillName: string,
  kind: 'core' | 'culture',
  referencePath: string,
): string {
  if (!root) {
    throw new Error(`rules-dir layout requires a non-null target root for ${skillName}-${kind}`);
  }
  const flat = referencePath.replace(/[\\/]/g, '-').replace(/\.(?:yaml|yml|md)$/i, '.md');
  const fileName = flat.endsWith('.md') ? flat : `${flat}.md`;
  return `${root}/${skillName}-${kind}-${fileName}`;
}

const CULTURE_DESCRIPTIONS: Record<string, string> = {
  'id/humor-boundaries.md': 'SARA, accent, distress, roast limits.',
  'id/dev-humor.md': 'dev satire and stack critique.',
  'id/absurd-humor.md': 'chaos pacing and anti-cringe.',
  'id/religious-expression.md': 'non-fatwa etiquette.',
};

function cultureRuleDescription(displayName: string, referencePath: string): string {
  const topic = CULTURE_DESCRIPTIONS[referencePath] ?? 'Indonesian culture & register.';
  return `${displayName} (${referencePath}): ${topic}`;
}

function alwaysOnBlock(input: AdapterInput, extra: string[] = []): string {
  return block([
    marker(input),
    input.core.trim(),
    '',
    input.card.trim(),
    ...extra,
    '<!-- hahahah:end -->',
  ]);
}

export class GenericHarnessAdapter implements Adapter {
  readonly id: string;
  readonly scope: 'workspace' | 'global';
  private readonly spec: HarnessSpec;

  constructor(spec: HarnessSpec, scope: 'workspace' | 'global' = 'workspace') {
    this.spec = spec;
    this.id = spec.id;
    this.scope = scope;
  }

  render(input: AdapterInput): Artifact[] {
    const skillName = `hahahah-${input.persona.id}`;
    const description = `ALWAYS ACTIVE on every message and conversation: ${input.persona.display_name} (${input.persona.locale}) persona, lu/gw tone, and response discipline. Invoke before replying to any user message, status check, greeting, or coding task.`;
    const root = this.scope === 'global' ? this.spec.globalOnDemandRoot : this.spec.onDemandRoot;

    if (this.spec.layout === 'fold') {
      // The target documents no on-demand layer, so anything kept out of the instructions file is
      // simply never seen. Folding is honest but expensive, and build() warns about the cost.
      return [
        {
          path: this.spec.blockPath,
          content: alwaysOnBlock(input, [
            '',
            '<!-- folded: this target has no on-demand layer, so the voice ships inline -->',
            '',
            input.voice.trim(),
          ]),
          kind: 'always_on',
        },
      ];
    }

    if (this.spec.layout === 'rules-dir') {
      if (!root) {
        throw new Error(`rules-dir layout requires a non-null target root for ${skillName}`);
      }
      const alwaysOnRule = (path: string, content: string, kind: 'skill_body' | 'reference') => ({
        path,
        content: block(['---', 'trigger: always_on', '---', '', content.trim()]),
        kind,
      });
      const modelDecisionRule = (path: string, ruleDesc: string, content: string) => ({
        path,
        content: block([
          '---',
          'trigger: model_decision',
          `description: ${JSON.stringify(ruleDesc)}`,
          '---',
          '',
          content.trim(),
        ]),
        kind: 'reference' as const,
      });
      const isAlwaysOnCulture = (refPath: string) =>
        /(?:^|\/)(?:genz-lexicon|memes)\.yaml$|(?:^|\/)(?:dev|absurd)-humor\.md$/i.test(refPath);
      const rules = [
        alwaysOnRule(`${root}/${skillName}-voice.md`, input.voice, 'skill_body'),
        alwaysOnRule(`${root}/${skillName}-lexicon.md`, input.lexiconMarkdown, 'reference'),
        ...input.coreRefs.map((reference) =>
          modelDecisionRule(
            flatRulePath(root, skillName, 'core', reference.path),
            `${input.persona.display_name} (${reference.path}): overrides voice.`,
            reference.content,
          ),
        ),
        ...input.cultureRefs.map((reference) =>
          isAlwaysOnCulture(reference.path)
            ? alwaysOnRule(
                flatRulePath(root, skillName, 'culture', reference.path),
                reference.content,
                'reference',
              )
            : modelDecisionRule(
                flatRulePath(root, skillName, 'culture', reference.path),
                cultureRuleDescription(input.persona.display_name, reference.path),
                reference.content,
              ),
        ),
      ];
      return [
        {
          path: this.spec.blockPath,
          content: alwaysOnBlock(input, ['', `Rules: \`${root}/\`.`]),
          kind: 'always_on',
        },
        ...rules,
      ];
    }

    if (!root) {
      throw new Error(`skill-tree layout requires a non-null target root for ${skillName}`);
    }

    // skill-tree: a SKILL.md entry plus references, under whichever root the vendor documents.
    const references = [
      {
        path: `${root}/${skillName}/references/lexicon.md`,
        content: `${input.lexiconMarkdown.trim()}\n`,
        kind: 'reference' as const,
      },
      ...input.coreRefs.map((reference) => ({
        path: `${root}/${skillName}/references/core/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
      ...input.cultureRefs.map((reference) => ({
        path: `${root}/${skillName}/references/culture/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
    ];
    return [
      { path: this.spec.blockPath, content: alwaysOnBlock(input), kind: 'always_on' },
      {
        path: `${root}/${skillName}/SKILL.md`,
        content: block([
          '---',
          `name: ${skillName}`,
          `description: ${JSON.stringify(description)}`,
          '---',
          '',
          input.voice.trim(),
          '',
          'Load `references/lexicon.md` for terms, `references/core/*.md` for the full identity, safety, decision, and efficiency policies, and `references/culture/*` for humor boundaries and regional guidance. Read a reference only when the task needs it.',
        ]),
        kind: 'skill_body',
      },
      ...references,
    ];
  }
}
