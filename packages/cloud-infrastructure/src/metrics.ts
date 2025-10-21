/**
 * Metrics Tracking
 *
 * Tracks execution metrics for monitoring and observability.
 */

interface ExecutionMetric {
  workspaceId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface MetricsSummary {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  averageDuration: number;
  recentErrors: Array<{
    timestamp: string;
    error: string;
    workspaceId: string;
  }>;
  activeSessions: number;
}

class MetricsTracker {
  private executions: ExecutionMetric[] = [];
  private activeSessions: Set<string> = new Set();
  private readonly MAX_STORED_EXECUTIONS = 1000;
  private readonly MAX_STORED_ERRORS = 50;

  /**
   * Record start of task execution
   */
  startExecution(sessionId: string): void {
    this.activeSessions.add(sessionId);
  }

  /**
   * Record completion of task execution
   */
  recordExecution(metric: Omit<ExecutionMetric, 'duration'>): void {
    const execution: ExecutionMetric = {
      ...metric,
      duration: metric.endTime - metric.startTime,
    };

    this.executions.push(execution);
    this.activeSessions.delete(metric.sessionId);

    // Keep only recent executions
    if (this.executions.length > this.MAX_STORED_EXECUTIONS) {
      this.executions = this.executions.slice(-this.MAX_STORED_EXECUTIONS);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const totalTasks = this.executions.length;
    const successfulTasks = this.executions.filter((e) => e.success).length;
    const failedTasks = totalTasks - successfulTasks;
    const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;

    const totalDuration = this.executions.reduce((sum, e) => sum + e.duration, 0);
    const averageDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;

    const recentErrors = this.executions
      .filter((e) => !e.success && e.error)
      .slice(-this.MAX_STORED_ERRORS)
      .map((e) => ({
        timestamp: new Date(e.endTime).toISOString(),
        error: e.error!,
        workspaceId: e.workspaceId,
      }));

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      recentErrors,
      activeSessions: this.activeSessions.size,
    };
  }

  /**
   * Get detailed execution history
   */
  getExecutionHistory(limit: number = 100): ExecutionMetric[] {
    return this.executions.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.executions = [];
    this.activeSessions.clear();
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }
}

// Singleton instance
export const metrics = new MetricsTracker();
