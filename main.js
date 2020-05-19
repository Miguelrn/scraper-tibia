var worlds = ["Antica", "Assombra", "Astera", "Belluma", "Belobra", "Bona", "Calmera", "Carnera", "Celebra", "Celesta", "Concorda", "Cosera", "Damora", "Descubra", "Dibra", "Duna", "Epoca", "Estela", "Faluna", "Ferobra", "Firmera", "Funera", "Furia", "Garnera", "Gentebra", "Gladera", "Harmonia", "Helera", "Honbra", "Impera", "Inabra", "Jonera", "Kalibra", "Kenora", "Lobera", "Luminera", "Lutabra", "Macabra", "Menera", "Mitigera", "Monza", "Nefera", "Noctera", "Nossobra", "Olera", "Ombra", "Pacera", "Peloria", "Premia", "Pyra", "Quelibra", "Quintera", "Refugia", "Relania", "Relembra", "Secura", "Serdebra", "Serenebra", "Solidera", "Talera", "Torpera", "Tortura", "Venebra", "Vita", "Vunira", "Wintera", "Zuna", "Zunera"];
var bosses = ['\'arachir the ancient one\'', '\'sir valorcrest\'', '\'zevelon duskbringer\'', '\'diblis the fair\'', '\'undead cavebears\'', '\'midnight panthers\'', '\'white pale\''];
bosses.push('\'dharalion\'', '\'fernfang\'', '\'countess sorrow\'', '\'massacre\'', '\'mr. punish\'', '\'the plasmother\'', '\'dracola\'', '\'the handmaiden\'', '\'the imperor\'', '\'seacrest serpents\'', '\'shaburak demons\'', '\'askarak demons\'', '\'dire penguins\'');
bosses.push('\'demodras\'', '\'yetis\'');

const { Pool, Client } = require("pg");
const Discord = require('discord.js');
const Table = require('cli-table');
var colors = require('colors');
//colors.enabled(false);
//colors.disable();//la tabla saldra sin colores en discord, porque lo formatea en texto plano
const client = new Discord.Client();
const {token, channel_id} = require('./auth.json');
const database = require('./database.json');
//https://discord.js.org/#/docs/main/v11/class/TextChannel?scrollTo=send


const pool = new Pool({
  user: database.user,
  host: database.host,
  database: database.database,
  password: database.password,
  port: database.port
});
const table_mobs = new Table({
  chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
           'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
           'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
           'right': '' , 'right-mid': '' , 'middle': ' ' },
  style: { 'padding-left': 0, 'padding-right': 0 },
  head: ['Monster', 'kills'], colWidths: [18, 8]
});
const table_boss = new Table({
  chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
          'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
          'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
          'right': '' , 'right-mid': '' , 'middle': ' ' },
  style: { 'padding-left': 0, 'padding-right': 0},
  head: ['Bosses', 'kills'], colWidths: [18, 8]
});

var cloudscraper = require('cloudscraper');
const parse5 = require('parse5');
var moment = require('moment');

// funcion encargada de leer las muertes de todos los bichos en todos los mundos de tibia
function process_kills(yesterday){

  console.log('Procesando worlds ...');

  const sql2 =  'DELETE FROM kills where server_date = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\')';//incase today kills failed to load and its reprocesing (async will no delete all of them!)
  pool.query(sql2);

  for(var j = 0; j < worlds.length; j++) {
    const world = worlds[j];
    var options = {
      uri: 'https://www.tibia.com/community/?subtopic=killstatistics',
      formData: { 'world': world,
      'Submit.x': Math.random() * 100,
      'Submit.y': Math.random() * 30 }
    };
  
    cloudscraper.post(options).then(function (htmlString) {
      const document = parse5.parse(htmlString);
      // html < body < div#mainHelper1 < div#mainHelper2 < div#bodyContainer < div#ContentRow < div#ContenColumn < 
      // div#Content.Content < div#ContentHelper < div#KillStatistic.Box < div.Border_2 < div.Border_3 < div.BoxContent < form < table < tbody < TRs
      const elements = document.childNodes[1].childNodes[2].childNodes[7].childNodes[1].childNodes[3].childNodes[1].childNodes[3].childNodes[1].childNodes[1].childNodes[3].childNodes[10].childNodes[1].childNodes[1].childNodes[1].childNodes[5].childNodes[0].childNodes;
      client.destroy();
      for(var i = 3; i < elements.length - 1; i++) { // 2 headers in tbody !! <.< !! 1 footer in the last tr
        // <tr><td>TEXT</td><td>TEXT</td><td>TEXT</td><td>TEXT</td></tr>
        //console.log(i, elements[i].childNodes[0].childNodes[0].value, elements[i].childNodes[2].childNodes[0].value); // iesimo tr -> nombre y kills
        const mob = elements[i].childNodes[0].childNodes[0].value.replace('\'', '\'\'').trim();
        const kills = elements[i].childNodes[2].childNodes[0].value.trim();
        if(kills != 0) {
          const sql = 'INSERT INTO kills (server_name, monster, kills, server_date) VALUES (\''+world+'\', \''+mob+'\', '+kills+', to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\'))';
          pool.query(
            sql,
            (err, res) => {
              if(err) {
                console.log(world + ' has failed to load, deleting all the statistic from today');
                const sql2 =  'DELETE FROM kills where server_date = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\')';
                pool.query(sql2);
                const sql3 = 'update bots_date set last_update = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') where bot_id = \'kills_bot\'';
                pool.query(sql3);
              }
                
              //pool.end();
            }
          );
        }
      }
    }).catch(function(){
        console.log(world + ' has failed to load, deleting all the statistic from today');
        const sql3 = 'update bots_date set last_update = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') where bot_id = \'kills_bot\'';
        pool.query(sql3);
      }
    );
  }
}

// funcion encargada de escribir en discord las muertes mas relevantes
function informDiscord(today, yesterday){
  const sql_kills = 'SELECT count(*) as cantidad FROM bots_date where last_update = to_date(\''+today.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') and bot_id = \'discord_bot\'';
  const sql_top = 'SELECT * FROM kills where server_name = \'Secura\' and server_date = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') order by kills desc';
  const sql_boss = 'SELECT * FROM kills where server_name = \'Secura\' and server_date = to_date(\''+yesterday.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') and lower(monster) in ('+bosses+')';
  var aux_msg = '--------------------------------\n' +'--------- ' + yesterday.format('DD/MM/YYYY') + ' ---------\n' + '--------------------------------\n';
  pool.query(sql_top, (err, top) => {
    for(var i = 0; i < top.rowCount && i < 10; i++) {
      table_mobs.push(
        [top.rows[i].monster , top.rows[i].kills]
      );
    }
  });
  pool.query(sql_boss, (err, boss) => {
    for(var i = 0; i < boss.rowCount; i++) {
      table_boss.push(
        [boss.rows[i].monster , boss.rows[i].kills]
      );
    }
  });
  
  pool.query(sql_kills, (err, res) => {
    client.on('ready', () => {
      if(res.rows[0].cantidad == 0 && today.hour() >= 11){//aun no habia sido escrito
        //falta hacer un update al bot checker

          client.channels.get(channel_id).send(table_mobs.toString())
          .then(message => console.log(`Sent message: ${message.content}`))
          .catch(console.error);

          client.channels.get(channel_id).send(table_boss.toString())
          .then(message => console.log(`Sent message: ${message.content}`))
          .then(client.destroy())
          .catch(console.error);


          const sql_update_discord = 'update bots_date set last_update = current_timestamp where bot_id = \'discord_bot\'';
          pool.query(sql_update_discord, (err, res) => { 
            console.log('Update time of discord')},
          )
          //client.channels.get(channel_id).send('Edison Tibia, escribio en Barrio Privado a las 18:35: \'Cabron que no los viste\'');
          
      } 
      else {
        client.destroy();
      }
    });
    
  });

}

function scraper(){

  var today = moment();
  var yesterday = moment().subtract(1, 'days');
  const sql_check = 'SELECT count(*) as cantidad FROM bots_date where last_update = to_date(\''+today.format('DD/MM/YYYY')+'\', \'DD/MM/YYYY\') and bot_id = \'kills_bot\'';
  const sql_update_time = 'update bots_date set last_update = current_timestamp where bot_id = \'kills_bot\'';

  pool.query(sql_check, (err, res) => {
    if(res.rows[0].cantidad == 0 && today.hour() >= 11){
      process_kills(yesterday);
      pool.query(sql_update_time, (err, res) => {console.log('Update time of bot')})
    }
    else {
      console.log('Today was already processed: ' + today.format('DD/MM/YYYY hh:mm:ss'));
      informDiscord(today, yesterday);
    }
  });
}

function main(){
  setInterval(scraper, 1000*60*10);
}

client.login(token);
scraper();
//setInterval(scraper, 1000*60*10);

/**/
//pool.end();
