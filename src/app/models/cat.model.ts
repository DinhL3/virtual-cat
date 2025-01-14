export interface Cat {
  _id?: string;
  name: string;
  owner: string;
  adoptedOn: Date;

  lastActions: {
    fedAt: Date;
    playedWithAt: Date;
    brushedAt: Date;
  };

  parameters: {
    affection: number;
    hunger: number;
    thirst: number;
    fun: number;
    energy: number;
    hygiene: number;
  };

  status: 'alive' | 'dead';

  coatType: 'tabby' | 'void' | 'tuxedo' | 'orange' | 'calico' | 'snow';

  createdAt?: Date;
  updatedAt?: Date;
}

// type for creating a new cat
export type CreateCatDto = Omit<
  Cat,
  '_id' | 'owner' | 'createdAt' | 'updatedAt'
>;

// type for updating cat parameters
export interface UpdateCatParametersDto {
  parameters: {
    affection?: number;
    hunger?: number;
    thirst?: number;
    fun?: number;
    energy?: number;
    hygiene?: number;
  };
}
