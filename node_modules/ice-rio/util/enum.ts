import sequelize from 'sequelize';
export * from 'sequelize';
export enum ErrorCode {
  ServiceError = 500,
  ParameterError = 422
}

export const seq = sequelize;
