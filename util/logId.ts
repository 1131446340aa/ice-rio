import { timeFormator } from './time';
/**
 * @description: 生成 logId
 * @return {*}
 */
export function generateLogId(): string {
  const date = new Date();
  const timeStr = timeFormator(date, 'yyyyMMddHHmmss');
  const msStr = String(date.getTime()).slice(-3);
  const ipStr = getIPAddress()
    .split('.')
    //@ts-ignore
    .map((item) => item.padStart(3, '0'))
    .join('');
  const randomStr = Math.round(Math.random() * 0xfff)
    .toString(16)
    .padStart(3, '0')
    .toUpperCase();
  return [timeStr, ipStr, msStr, randomStr].join('');
}

function getIPAddress() {
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === 'IPv4' &&
        alias.address !== '127.0.0.1' &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}
