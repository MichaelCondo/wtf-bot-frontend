const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Listens to incoming messages that contain "hello"
app.message('WTF is ', async ({ message, say }) => {
  // Extract search term
  triggerKeyword = "WTF is ";
  text = message.text;
  search_term  = text.substring(triggerKeyword.length + text.search(new RegExp(triggerKeyword)));

  // Send GET to Rails server
  let resp = null;
  try {
    resp = await getDefinition(search_term.toLowerCase());

    if (resp.status == 200){
      await say(resp.data.description);
    }
  } catch (err) {
    if (err.response.status == 404) {
      await say({
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `${search_term} not found, would you like to add to our Flipp dictionary?`
            },
          }, 
          {
            "dispatch_action": true,
            "type": "input",
            "element": {
              "type": "plain_text_input",
              "action_id": "add_term-action",
              "multiline": true
            },
            "label": {
              "type": "plain_text",
              "text": "Add "+search_term,
              "emoji": true
            }
          }
        ],
        text: `${search_term} not found, would you like to add to our Flipp dictionary?`
      });
    } else {
      console.error(err)
    }
  }
  // If GET returns something, display answer and have options to update or delete the term
});

  // say() sends a message to the channel where the event was triggered
  
app.action('add_term-action', async ({ body, ack, respond, action }) => {
  // Acknowledge the action
  await ack();
  word = body.message.text.substring(0, body.message.text.search(/ not found,/));

  await createDefinition(word.toLowerCase(), body.user.username, action.value)
  await respond(`${word} has been added!`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();



async function getDefinition(word) {
  RAILS_APP_SERVER = "http://localhost:3001/api/v1/entries";
  targetUrl = RAILS_APP_SERVER+"?word="+word;

  return axios({
    method: "get",
    url: targetUrl,
  }).then(res => res);
}

async function createDefinition(word, author, description) {
  RAILS_APP_SERVER = "http://localhost:3001/api/v1/entries";
  targetUrl = RAILS_APP_SERVER;

  return axios({
    method: "post",
    url: targetUrl,
    data: {
      word: word,
      author: author,
      description: description
    }
  }).then(res => res);
}
