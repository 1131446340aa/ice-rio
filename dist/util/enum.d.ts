import sequelize from 'sequelize';
export { Model, ModelCtor, DataTypes } from 'sequelize';
export declare enum ErrorCode {
    ServiceError = 500,
    ParameterError = 422
}
export declare const seq: typeof sequelize;
