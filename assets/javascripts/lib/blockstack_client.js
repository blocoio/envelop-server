import {AppConfig, UserSession} from 'blockstack';
import Constants from './constants';

export const authOptions = {
  redirectTo: '/',
  finished: ({ }) => {
    window.location = Constants.BLOCKSTACK_REDIRECT_URI;
  },
  appDetails: {
    name: 'Envelop',
    icon: 'https://envelop.app/images/manifest-icon.png',
  },
};

function getUserSession(scopes) {
  const appConfig = new AppConfig(scopes, Constants.BLOCKSTACK_ORIGIN);
  return new UserSession({ appConfig: appConfig });
}

export const privateUserSession = getUserSession(['store_write', 'publish_data']);
export const publicUserSession = getUserSession([]);

