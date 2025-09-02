import 'dotenv/config';
import appJson from './app.json';

export default () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      API_URL: process.env.API_URL || "http://10.147.19.99:8000/api", //Aquí replicar la ip que esta en .env
    },
  },
});