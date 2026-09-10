import {describe,expect,it} from "vitest";
import {scoreEspnProjectedStats} from "./espn-projected-stats";
describe("provider stats scoring",()=>{it("uses Fourth Down league rules instead of provider points",()=>{const stats={passingYards:250,passingTouchdowns:2,passingInterceptions:1};expect(scoreEspnProjectedStats(stats,{passingYard:.4,passingTd:4,interceptionThrown:-2})).toBe(16);expect(scoreEspnProjectedStats(stats,{passingYard:.5,passingTd:6,interceptionThrown:-1})).toBe(23.5);});});
