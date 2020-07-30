import { ipcMain } from 'electron';
import * as Redis from 'ioredis';

const instance: { [id: string]: Redis.Redis } = {};

ipcMain.on('redis:create', (event, args) => {
  if (!instance.hasOwnProperty(args.id)) {
    instance[args.id] = new Redis(args.options);
  }
});

ipcMain.on('redis:config', async (event, args) => {
  if (!instance.hasOwnProperty(args.id)) {
    event.returnValue = {
      error: 1,
      msg: 'Instance does not exist'
    };
    return;
  }
  try {
    const redis = instance[args.id];
    const data = await redis.config('GET', args.key);
    event.returnValue = {
      error: 0,
      data
    };
  } catch (e) {
    event.returnValue = {
      error: 1,
      msg: e.message
    };
  }
});

ipcMain.on('redis:select', async (event, args) => {
  if (!instance.hasOwnProperty(args.id)) {
    event.returnValue = {
      error: 1,
      msg: 'Instance does not exist'
    };
    return;
  }
  try {
    const redis = instance[args.id];
    const msg = await redis.select(args.index);
    event.returnValue = {
      error: 0,
      msg
    };
  } catch (e) {
    event.returnValue = {
      error: 1,
      msg: e.message
    };
  }
});

ipcMain.on('redis:scan', (event, args) => {
  if (!instance.hasOwnProperty(args.id)) {
    event.returnValue = {
      error: 1,
      msg: 'Instance does not exist'
    };
    return;
  }
  try {
    const redis = instance[args.id];
    const stream = redis.scanStream(args.options);
    const keys: any[] = [];
    stream.once('data', (resultKeys) => {
      for (const key of resultKeys) {
        keys.push(key);
      }
    });
    stream.once('end', async () => {
      const data: any[] = [];
      while (keys.length !== 0) {
        const key = keys.pop();
        const type: string = await redis.type(key);
        data.push({
          key,
          type: type.toLocaleUpperCase()
        });
      }
      event.returnValue = {
        error: 0,
        data
      };
      stream.destroy();
    });
  } catch (e) {
    event.returnValue = {
      error: 1,
      msg: e.message
    };
  }
});

ipcMain.on('redis:delete', async (event, args) => {
  if (!instance.hasOwnProperty(args.id)) {
    event.returnValue = {
      error: 1,
      msg: 'Instance does not exist'
    };
    return;
  }
  try {
    const redis: Redis.Redis = instance[args.id];
    const data = await redis.del(...args.keys);
    event.returnValue = {
      error: 0,
      data
    };
  } catch (e) {
    event.returnValue = {
      error: 1,
      msg: e.message
    };
  }
});

ipcMain.on('redis:destory', (event, args) => {
  if (instance.hasOwnProperty(args.id)) {
    instance[args.id].disconnect();
    delete instance[args.id];
  }
});