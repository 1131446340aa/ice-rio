"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function initSequelize(sequelize) {
    sequelize
        .sync({ force: false })
        .then((res) => {
        console.log('success');
    })
        .catch((err) => {
        console.log(err.message);
    });
    sequelize
        .authenticate()
        .then(() => {
        console.log('连接数据库成功');
    })
        .catch(() => {
        console.log('连接数据库失败');
    });
    return sequelize;
}
exports.default = initSequelize;
