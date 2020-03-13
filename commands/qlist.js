'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');

module.exports = () => {
  return {
    usage: 'qlist [area]',
    requiredRole: PlayerRoles.BUILDER,
    command: (state) => (args, player, arg0) => {


      let [areaSearch,] = args.split(' ');
      let padChar = '.', area;

      if (areaSearch) {
        const { target, area: resultArea, idNum } = SU.findER(state, player, 'area', areaSearch);
        area = resultArea;
      } else {
        area = player.room.area;
      }

      if (!area) {
        return B.sayAt(player, `Can't find the area of ${areaSearch}.`);
      }

      const idLength = [...state.QuestFactory.quests.values()]
        .filter(quest => quest.area === area.name)
        .reduce((acc, quest) => Math.max(quest.id.toString().length, acc), 10);

      let i = 0;
      let msg = `<green>%4d</green><white>) [</white><green>%${idLength}s</green><white>]</white> <cyan>%-50s</cyan><yellow>%3s</yellow>`;
      B.sayAt(player, sprintf(`<green>%4s</green><white>)</white> <green>%${idLength + 2}s</green> <cyan>%-50s</cyan><yellow>[%3s]</yellow>`, '#', 'ID', 'Quest Name', 'Lvl'));
      B.sayAt(player, `<white>----- ${B.line(idLength + 2, '-')} ------------------------------------------------- -----</white>`);

      for (const [qid, quest] of state.QuestFactory.quests) {
        if (quest.area === area.name) {
          i += 1;
          const name = sprintf('%-50s', quest.config.title).replace(/\s{1}(?=\s)/g, i % 2 ? ' ' : padChar);
          const level = quest.config.level || 0;
          B.sayAt(player, sprintf(msg, i, quest.id, name, level));
        }
      }
    }
  }
};