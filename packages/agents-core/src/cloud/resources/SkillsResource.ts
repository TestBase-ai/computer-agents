import type { ApiClient } from '../ApiClient';
import type { CreateSkillParams, Skill, SkillCategory, UpdateSkillParams } from '../types';

export interface ListSkillsParams {
  category?: SkillCategory;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class SkillsResource {
  constructor(private readonly client: ApiClient) {}

  async create(params: CreateSkillParams): Promise<Skill> {
    const response = await this.client.post<{ skill: Skill }>(`/skills`, params);
    return response.skill;
  }

  async list(params: ListSkillsParams = {}): Promise<Skill[]> {
    const response = await this.client.get<{
      data: Skill[];
      object?: string;
      has_more?: boolean;
      total_count?: number;
    }>(`/skills`, {
      category: params.category,
      isActive: params.isActive,
      limit: params.limit,
      offset: params.offset,
    });
    return response.data;
  }

  async get(skillId: string): Promise<Skill> {
    const response = await this.client.get<{ skill: Skill }>(`/skills/${skillId}`);
    return response.skill;
  }

  async update(skillId: string, params: UpdateSkillParams): Promise<Skill> {
    const response = await this.client.patch<{ skill: Skill }>(`/skills/${skillId}`, params);
    return response.skill;
  }

  async delete(skillId: string): Promise<boolean> {
    const response = await this.client.delete<{ success?: boolean; deleted?: boolean }>(`/skills/${skillId}`);
    return !!(response.success ?? response.deleted);
  }
}
