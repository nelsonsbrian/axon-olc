'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, PlayerRoles } = require('ranvier');

module.exports = () => {
  return {
    aliases: ['areas'],
    requiredRole: PlayerRoles.BUILDER,
    usage: 'areas',
    command: state => (args, player, arg0) => {
      const areas = [...state.AreaManager.areas.values()];

      const msg = `<green>%4s</green><white>) <cyan>%-50s</cyan> <yellow>%-6s</yellow>`;
      B.sayAt(player, sprintf(msg, '##', 'Area name', 'Rooms'));
      B.sayAt(player, `<white>----- ${B.line(49, '-')} ------</white>`);
      areas.forEach((a, i) => {
        const title = sprintf('%-50s', a.title).replace(/\s{1}(?=\s)/g, i % 2 ? ' ' : '.');
        B.sayAt(player, sprintf(msg, i + 1, title, String(a.rooms.size)));
      });

      B.sayAt(player, `\r\n<cyan>[<b><yellow>${areas.length}</yellow></b>] available zones</cyan>`)

    }
  };
};


