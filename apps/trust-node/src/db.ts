/**
 * In-memory store for V0.1
 *
 * For V0.1, we use a simple in-memory store.
 * This is sufficient for testing and demonstration.
 * V0.2+ can use a persistent database like SQLite.
 */

export interface Agent {
  did: string;
  publicKey: string;
  name: string;
  registeredAt: number;
}

export interface Offer {
  id: string;
  providerId: string;
  capability: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
  pricePerJob: number;
  publishedAt: number;
}

export interface Job {
  id: string;
  offerId: string;
  clientId: string;
  providerId: string;
  state: string;
  requiredAttestations: number;
  createdAt: number;
  timeoutSeconds: number;
  escrowAmount: number;
}

export interface EventLogEntry {
  id: number;
  jobId: string;
  eventType: string;
  actor: string;
  previousHash: string;
  payload: string;
  signature: string;
  createdAt: number;
}

/**
 * In-memory store
 */
class Store {
  private agents = new Map<string, Agent>();
  private offers = new Map<string, Offer>();
  private jobs = new Map<string, Job>();
  private eventLog: EventLogEntry[] = [];
  private eventLogId = 0;

  // =========================================================================
  // Agents
  // =========================================================================

  insertAgent(agent: Agent): void {
    if (this.agents.has(agent.did)) {
      throw new Error(`Agent ${agent.did} already exists`);
    }
    this.agents.set(agent.did, agent);
  }

  getAgent(did: string): Agent | undefined {
    return this.agents.get(did);
  }

  getAgentByPublicKey(publicKey: string): Agent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.publicKey === publicKey) {
        return agent;
      }
    }
    return undefined;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // =========================================================================
  // Offers
  // =========================================================================

  insertOffer(offer: Offer): void {
    if (this.offers.has(offer.id)) {
      throw new Error(`Offer ${offer.id} already exists`);
    }
    this.offers.set(offer.id, offer);
  }

  getOffer(id: string): Offer | undefined {
    return this.offers.get(id);
  }

  getAllOffers(): Offer[] {
    return Array.from(this.offers.values());
  }

  getOffersByCapability(capability: string): Offer[] {
    return Array.from(this.offers.values()).filter((o) => o.capability === capability);
  }

  // =========================================================================
  // Jobs
  // =========================================================================

  insertJob(job: Job): void {
    if (this.jobs.has(job.id)) {
      throw new Error(`Job ${job.id} already exists`);
    }
    this.jobs.set(job.id, job);
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJobState(jobId: string, newState: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    job.state = newState;
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getJobsByClient(clientId: string): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.clientId === clientId);
  }

  getJobsByProvider(providerId: string): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.providerId === providerId);
  }

  // =========================================================================
  // Event Log
  // =========================================================================

  insertEventLogEntry(entry: Omit<EventLogEntry, 'id'>): EventLogEntry {
    this.eventLogId++;
    const fullEntry: EventLogEntry = {
      ...entry,
      id: this.eventLogId,
    };
    this.eventLog.push(fullEntry);
    return fullEntry;
  }

  getEventLogEntriesByJobId(jobId: string): EventLogEntry[] {
    return this.eventLog.filter((e) => e.jobId === jobId);
  }

  getAllEventLogEntries(): EventLogEntry[] {
    return [...this.eventLog];
  }

  getLastEventHashForJob(jobId: string): string | undefined {
    const entries = this.getEventLogEntriesByJobId(jobId);
    if (entries.length === 0) {
      return undefined;
    }
    return entries[entries.length - 1].previousHash;
  }
}

let store: Store | null = null;

/**
 * Initialize store
 */
export function initializeDB(dbPath?: string): Store {
  if (store) return store;
  store = new Store();
  console.log('Database initialized (in-memory)');
  return store;
}

/**
 * Get store instance
 */
export function getDB(): Store {
  if (!store) {
    throw new Error('Database not initialized. Call initializeDB first.');
  }
  return store;
}

/**
 * Close database (noop for in-memory)
 */
export function closeDB(): void {
  store = null;
}
