import { Sequelize } from 'sequelize';
export default async function initSequelize(
  sequelize: Sequelize
): Promise<Sequelize> {
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
