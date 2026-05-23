import path from 'path';
import fs from 'fs';

export interface ExecutionRecord {
  timestamp: string;
  success: boolean;
  attempt: number;
  error?: string;
}

export interface ExecutionState {
  completedCount: number;
  lastRunTime: string | null;
  history: ExecutionRecord[];
}

const defaultState: ExecutionState = {
  completedCount: 0,
  lastRunTime: null,
  history: []
};

export class Storage {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async loadState(): Promise<ExecutionState> {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load state, using default:', error);
    }
    return { ...defaultState };
  }

  async saveState(state: ExecutionState): Promise<void> {
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  }

  async recordExecution(success: boolean, attempt: number, error?: string): Promise<void> {
    const state = await this.loadState();
    const record: ExecutionRecord = {
      timestamp: new Date().toISOString(),
      success,
      attempt,
      error
    };
    state.history.push(record);
    if (success) {
      state.completedCount++;
    }
    state.lastRunTime = new Date().toISOString();
    await this.saveState(state);
  }

  async resetState(): Promise<void> {
    await this.saveState({ ...defaultState });
  }
}
