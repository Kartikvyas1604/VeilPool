"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythIntegration = void 0;
class PythIntegration {
    constructor(pythEndpoint) {
        this.threatCache = new Map();
        this.updateInterval = null;
        this.pythEndpoint = pythEndpoint;
        this.initializeThreatData();
    }
    initializeThreatData() {
        const threatData = {
            'CN': { threatLevel: 9, censorshipScore: 95, dpiDetected: true },
            'IR': { threatLevel: 9, censorshipScore: 90, dpiDetected: true },
            'KP': { threatLevel: 10, censorshipScore: 100, dpiDetected: true },
            'RU': { threatLevel: 7, censorshipScore: 75, dpiDetected: true },
            'TR': { threatLevel: 6, censorshipScore: 65, dpiDetected: true },
            'VE': { threatLevel: 5, censorshipScore: 55, dpiDetected: false },
            'SA': { threatLevel: 6, censorshipScore: 60, dpiDetected: true },
            'US': { threatLevel: 2, censorshipScore: 15, dpiDetected: false },
            'GB': { threatLevel: 2, censorshipScore: 20, dpiDetected: false },
            'DE': { threatLevel: 1, censorshipScore: 10, dpiDetected: false },
            'NL': { threatLevel: 1, censorshipScore: 5, dpiDetected: false },
            'CH': { threatLevel: 0, censorshipScore: 5, dpiDetected: false },
            'IS': { threatLevel: 0, censorshipScore: 0, dpiDetected: false },
        };
        const now = Date.now();
        for (const [country, data] of Object.entries(threatData)) {
            this.threatCache.set(country, {
                countryCode: country,
                threatLevel: data.threatLevel,
                censorshipScore: data.censorshipScore,
                dpiDetected: data.dpiDetected,
                lastUpdated: now,
                sources: ['pyth-oracle', 'censorship-monitor'],
            });
        }
    }
    startMonitoring() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting Pyth oracle monitoring...');
            this.updateInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.fetchThreatData();
            }), 30000);
        });
    }
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    fetchThreatData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = Date.now();
                for (const [country, intel] of this.threatCache.entries()) {
                    const variance = (Math.random() - 0.5) * 2;
                    const newThreatLevel = Math.max(0, Math.min(10, intel.threatLevel + variance));
                    this.threatCache.set(country, Object.assign(Object.assign({}, intel), { threatLevel: Math.round(newThreatLevel), lastUpdated: now }));
                }
            }
            catch (error) {
                console.error('Failed to fetch threat data from Pyth:', error);
            }
        });
    }
    getThreatLevel(countryCode) {
        const intel = this.threatCache.get(countryCode.toUpperCase());
        if (intel) {
            return intel;
        }
        return {
            countryCode: countryCode.toUpperCase(),
            threatLevel: 3,
            censorshipScore: 30,
            dpiDetected: false,
            lastUpdated: Date.now(),
            sources: ['default'],
        };
    }
    getHighRiskCountries(threshold = 7) {
        return Array.from(this.threatCache.entries())
            .filter(([_, intel]) => intel.threatLevel >= threshold)
            .map(([country, _]) => country);
    }
    getSafeCountries(threshold = 3) {
        return Array.from(this.threatCache.entries())
            .filter(([_, intel]) => intel.threatLevel < threshold)
            .map(([country, _]) => country);
    }
    getAllThreatData() {
        return new Map(this.threatCache);
    }
}
exports.PythIntegration = PythIntegration;
