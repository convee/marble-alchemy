import { describe, expect, it } from 'vitest';
import { Run, LEVELS, collisionDamage } from '../src/game';

describe('collision rules', () => {
  it('adds repeatable power and fire to each direct hit', () => {
    const run = new Run(); run.build.power = 2; run.build.fire = 3;
    expect(collisionDamage(run.build, 20)).toEqual({ direct: 6, chain: 0, total: 6, critical: false });
  });
  it('critical doubles direct damage including fire, never chain damage', () => {
    const run = new Run(); Object.assign(run.build, { power: 1, fire: 2, lightning: true, critical: true });
    expect(collisionDamage(run.build, 20, () => .199)).toEqual({ direct: 8, chain: 2, total: 10, critical: true });
    expect(collisionDamage(run.build, 20, () => .2).total).toBe(6);
  });
  it('lightning is capped at two other pegs and cannot recurse', () => {
    const run = new Run(); run.build.lightning = true;
    expect(collisionDamage(run.build, 0).chain).toBe(0);
    expect(collisionDamage(run.build, 1).chain).toBe(1);
    expect(collisionDamage(run.build, 1000).chain).toBe(2);
    run.launch(); run.hit(1000); expect(run.hits).toBe(1); expect(run.damage).toBe(3);
  });
  it('split triggers exactly once each shot, including child collisions', () => {
    const run = new Run(); run.build.split = true; run.launch();
    expect(run.hit(10)?.split).toBe(true);
    for (let i = 0; i < 10; i++) expect(run.hit(10)?.split).toBe(false);
    run.enemyHp = 1000; run.beginSettlement(); run.settle(); run.launch();
    expect(run.hit(10)?.split).toBe(true);
  });
});
describe('run lifecycle', () => {
  it('starts with five life, one base damage and five increasingly hard levels', () => {
    const run = new Run(); expect(run.hp).toBe(5); expect(run.phase).toBe('aiming'); expect(LEVELS).toHaveLength(5);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].hp).toBeGreaterThan(LEVELS[i - 1].hp);
  });
  it('does not damage enemy before settlement and rejects duplicate launches/settlements', () => {
    const run = new Run(); const hp = run.enemyHp;
    expect(run.launch()).toBe(true); expect(run.launch()).toBe(false);
    run.hit(20); expect(run.enemyHp).toBe(hp); expect(run.settle()).toBe(false);
    expect(run.beginSettlement()).toBe(true); expect(run.beginSettlement()).toBe(false);
    expect(run.settle()).toBe(true); expect(run.enemyHp).toBe(hp - 1); expect(run.hp).toBe(4);
    expect(run.settle()).toBe(false); expect(run.hp).toBe(4); expect(run.totalDamage).toBe(1);
  });
  it('loses on zero life, and rejects further hits and launches', () => {
    const run = new Run(); run.hp = 1; run.launch(); run.beginSettlement(); run.settle();
    expect(run.phase).toBe('lost'); expect(run.hp).toBe(0); expect(run.launch()).toBe(false); expect(run.hit(2)).toBeUndefined();
  });
  it('rolls three distinct upgrades, excluding owned unique passives', () => {
    const run = new Run(); run.build.lightning = run.build.split = run.build.critical = true;
    for (let i = 0; i < 100; i++) expect(new Set(run.rollOffers())).toEqual(new Set(['power', 'fire', 'heal']));
  });
  it('repeatable upgrades stack and healing is capped at five', () => {
    const run = new Run();
    for (const id of ['power', 'power', 'fire', 'fire'] as const) { run.phase = 'upgrade'; run.offers = [id]; run.choose(id); }
    expect(run.build.power).toBe(2); expect(run.build.fire).toBe(2);
    run.phase = 'upgrade'; run.offers = ['heal']; run.hp = 4; run.choose('heal'); expect(run.hp).toBe(5);
  });
  it('requires an offered upgrade and progresses through all five wins without retaliation', () => {
    const run = new Run(() => .5);
    for (let level = 0; level < 5; level++) {
      expect(run.level).toBe(level); run.launch(); run.damage = 1000; run.beginSettlement(); run.settle();
      expect(run.phase).toBe('upgrade'); expect(run.offers).toHaveLength(3); expect(new Set(run.offers).size).toBe(3); expect(run.hp).toBe(5);
      expect(run.choose('not-a-card' as never)).toBe(false); expect(run.choose(run.offers[0])).toBe(true);
      expect(run.choose(run.history.at(-1)!)).toBe(false);
    }
    expect(run.phase).toBe('won'); expect(run.launch()).toBe(false);
  });
});
