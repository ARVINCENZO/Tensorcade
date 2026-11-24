import * as React from 'react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@tensorcade/ui';
import {
  WorldCatalog,
  WorldCatalogItem,
  GameCatalogItem,
  type PlayMode,
} from '@tensorcade/contracts';
import { LEVEL_PREREQUISITES } from '@tensorcade/levels/dag';
import { DEFAULT_WORLD_CATALOG } from '../../data/defaultCatalog.js';
import type { LevelProgressRecord } from '../../storage/db.js';
import { isLevelUnlocked, useProgressStore } from '../../storage/useProgressStore.js';
import { OnboardingBanner } from './OnboardingBanner.js';
import { useSafeLevelNavigate } from './useSafeLevelNavigate.js';

export interface WorldMapLayoutProps {
  catalog?: WorldCatalog;
  progress?: Readonly<Record<string, LevelProgressRecord>> | undefined;
  onSelectLevel?: (levelId: string) => void;
}

const MODE_CREST_LABELS: Record<PlayMode, string> = {
  explorer: 'Sensor',
  builder: 'Assembly',
  hacker: 'Command',
};

function StarIndicators({ stars }: { stars: 0 | 1 | 2 | 3 }): React.JSX.Element {
  return (
    <span
      aria-label={`${stars} of 3 stars`}
      data-stars={stars}
      className="inline-flex items-center gap-0.5 font-mono text-xs"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className={index < stars ? 'text-[var(--tc-accent-amber)]' : 'text-[var(--tc-text-dim)]'}
        >
          {index < stars ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export function WorldMapLayout({
  catalog = DEFAULT_WORLD_CATALOG,
  progress: progressProp,
  onSelectLevel,
}: WorldMapLayoutProps): React.JSX.Element {
  const worlds = catalog.worlds;
  const initialWorldId = worlds[0]?.id ?? 'world-1';
  const [selectedWorldId, setSelectedWorldId] = React.useState<string>(initialWorldId);

  const storeProgress = useProgressStore((state) => state.progress);
  const progress = progressProp ?? storeProgress;
  const navigateToLevel = useSafeLevelNavigate();

  const handleSelectLevel = (levelId: string): void => {
    if (onSelectLevel) {
      onSelectLevel(levelId);
      return;
    }
    navigateToLevel(levelId);
  };

  const completedCount = Object.values(progress).filter(
    (record) => record.starsEarned > 0 || record.clearedModes.length > 0,
  ).length;

  const totalGames = worlds.reduce((acc, w) => acc + w.games.length, 0);
  const totalLevels = worlds.reduce(
    (acc, w) => acc + w.games.reduce((gAcc, g) => gAcc + g.levelIds.length, 0),
    0,
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 py-8">
        {/* World Map Header & Telemetry */}
        <header className="border-b border-[var(--tc-border-subtle)] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--tc-accent-emerald)]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--tc-text-muted)]">
                Operational Simulation Grid
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--tc-text-primary)]">
              Curriculum World Map
            </h1>
            <p className="mt-1 text-sm text-[var(--tc-text-muted)] max-w-2xl">
              Deterministic, simulation-driven computational curriculum from Python foundations to
              deep learning and autonomous agents.
            </p>
          </div>

          <div
            aria-label="Platform Telemetry Summary"
            className="flex items-center gap-4 bg-[var(--tc-bg-surface)] px-4 py-2 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] font-mono text-xs"
          >
            <div>
              <span className="text-[var(--tc-text-muted)]">SECTORS:</span>{' '}
              <span className="font-semibold text-[var(--tc-accent-cyan)]">{worlds.length}</span>
            </div>
            <div className="h-3 w-px bg-[var(--tc-border-subtle)]" />
            <div>
              <span className="text-[var(--tc-text-muted)]">GAMES:</span>{' '}
              <span className="font-semibold text-[var(--tc-accent-amber)]">{totalGames}</span>
            </div>
            <div className="h-3 w-px bg-[var(--tc-border-subtle)]" />
            <div>
              <span className="text-[var(--tc-text-muted)]">LEVELS:</span>{' '}
              <span className="font-semibold text-[var(--tc-accent-emerald)]">{totalLevels}</span>
            </div>
          </div>
        </header>

        {/* Onboarding Hero Card when zero levels are completed */}
        {worlds.length > 0 && (
          <OnboardingBanner
            completedCount={completedCount}
            onStartFirstLevel={() => handleSelectLevel('w1-robot-farm-1.1')}
          />
        )}

        {/* Empty Catalog Fallback */}
        {worlds.length === 0 ? (
          <section
            role="status"
            aria-label="Empty World Catalog"
            className="rounded-[var(--tc-radius-md)] border border-dashed border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-12 text-center"
          >
            <h2 className="text-lg font-semibold text-[var(--tc-text-primary)]">
              Simulation Grid Standby
            </h2>
            <p className="mt-2 text-sm text-[var(--tc-text-muted)]">
              No curriculum sectors are currently registered in this workspace catalog.
            </p>
          </section>
        ) : (
          /* World Tabs Navigation */
          <Tabs
            value={selectedWorldId}
            onValueChange={setSelectedWorldId}
            className="flex flex-col gap-6"
          >
            <nav aria-label="Curriculum Worlds Navigation">
              <TabsList className="w-full flex overflow-x-auto border-b border-[var(--tc-border-subtle)]">
                {worlds.map((world: WorldCatalogItem, index: number) => (
                  <TabsTrigger
                    key={world.id}
                    value={world.id}
                    className="whitespace-nowrap px-4 py-2 font-mono text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
                  >
                    SEC 0{index + 1}: {world.slug.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </nav>

            {/* World Sector Views */}
            {worlds.map((world: WorldCatalogItem) => (
              <TabsContent key={world.id} value={world.id} className="focus-visible:outline-none">
                <section
                  aria-labelledby={`world-title-${world.id}`}
                  className="flex flex-col gap-6"
                >
                  <div className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-5">
                    <h2
                      id={`world-title-${world.id}`}
                      className="text-xl font-bold tracking-tight text-[var(--tc-text-primary)]"
                    >
                      {world.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--tc-text-muted)]">
                      Sector identifier:{' '}
                      <code className="text-[var(--tc-accent-cyan)] font-mono">{world.slug}</code>.
                      Engage deliberate practice across simulated physical, numerical, and neural
                      domains.
                    </p>
                  </div>

                  {/* Games in Sector */}
                  {world.games.length === 0 ? (
                    <div
                      role="status"
                      className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-8 text-center text-sm text-[var(--tc-text-muted)]"
                    >
                      No active simulation modules deployed to this sector yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {world.games.map((game: GameCatalogItem) => {
                        const firstUnlockedLevel = game.levelIds.find((id) =>
                          isLevelUnlocked(id, progress, LEVEL_PREREQUISITES),
                        );

                        return (
                          <article
                            key={game.id}
                            className="flex flex-col justify-between rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-5 transition-colors hover:border-[var(--tc-accent-cyan)]"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-xs text-[var(--tc-accent-amber)] uppercase">
                                  Flagship Game
                                </span>
                                <span className="font-mono text-xs text-[var(--tc-text-muted)]">
                                  {game.levelIds.length} levels
                                </span>
                              </div>

                              <h3 className="text-base font-semibold text-[var(--tc-text-primary)]">
                                {game.name}
                              </h3>
                              <p className="mt-1 text-xs text-[var(--tc-text-muted)] font-mono">
                                ID: {game.id}
                              </p>

                              <div className="mt-4 flex flex-col gap-2">
                                {game.levelIds.map((lvlId: string, lvlIdx: number) => {
                                  const unlocked = isLevelUnlocked(
                                    lvlId,
                                    progress,
                                    LEVEL_PREREQUISITES,
                                  );
                                  const record = progress[lvlId];
                                  const starsEarned = record?.starsEarned ?? 0;
                                  const clearedModes = record?.clearedModes ?? [];
                                  const prereqs = LEVEL_PREREQUISITES[lvlId] ?? [];

                                  return (
                                    <Tooltip key={lvlId}>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-disabled={!unlocked ? true : undefined}
                                          data-locked={!unlocked ? 'true' : 'false'}
                                          onClick={() => {
                                            if (unlocked) {
                                              handleSelectLevel(lvlId);
                                            }
                                          }}
                                          aria-label={
                                            unlocked
                                              ? `Launch Level ${lvlIdx + 1}: ${lvlId}`
                                              : `Locked Level ${lvlIdx + 1}: ${lvlId}. Requires ${prereqs.join(', ')}`
                                          }
                                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--tc-radius-sm)] border font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)] ${
                                            unlocked
                                              ? 'border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] hover:border-[var(--tc-accent-cyan)] hover:text-[var(--tc-accent-cyan)] cursor-pointer'
                                              : 'border-dashed border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] text-[var(--tc-text-muted)] cursor-not-allowed'
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            {!unlocked && (
                                              <span className="text-[var(--tc-text-muted)]">
                                                Locked{' '}
                                              </span>
                                            )}
                                            <span className="font-semibold">
                                              Level {lvlIdx + 1}
                                            </span>
                                          </span>

                                          <span className="flex items-center gap-2">
                                            {clearedModes.length > 0 && (
                                              <span className="flex items-center gap-1">
                                                {clearedModes.map((mode) => (
                                                  <span
                                                    key={mode}
                                                    className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-emerald)] px-1.5 py-0.5 text-[var(--tc-accent-emerald)]"
                                                  >
                                                    {MODE_CREST_LABELS[mode]}
                                                  </span>
                                                ))}
                                              </span>
                                            )}
                                            <StarIndicators stars={starsEarned} />
                                          </span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {unlocked ? (
                                          <span className="font-mono text-xs">{lvlId}</span>
                                        ) : (
                                          <span className="font-mono text-xs">
                                            Locked &mdash; Requires: {prereqs.join(', ')}
                                          </span>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-[var(--tc-border-subtle)] flex items-center justify-between">
                              <span className="font-mono text-xs text-[var(--tc-accent-emerald)] flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--tc-accent-emerald)]" />
                                VERIFIED
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={!firstUnlockedLevel}
                                onClick={() => {
                                  if (firstUnlockedLevel) {
                                    handleSelectLevel(firstUnlockedLevel);
                                  }
                                }}
                              >
                                Launch Game
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
}
