'use strict';

module.exports = (srcPath, bundlesPath) => {

  return {
    requiredRole: PlayerRoles.ADMIN,
    usage: 'redit <ER> || save <area>',
    command: (state) => (args, player, arg0) => {

      console.log('test')
    }
  }
};
