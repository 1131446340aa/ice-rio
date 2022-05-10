import fs from 'fs';
import { join } from 'path';
export class IceFs {
  deleteAllFile(dir: string) {
    for (let i of fs.readdirSync(dir)) {
      fs.unlinkSync(join(dir, i));
    }
  }
  makeDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }
  BeforeAppend(dir: string, content: string) {
    fs.writeFileSync(
      dir,
      `${content}
${fs.readFileSync(dir)}`
    );
  }
}
