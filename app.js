const { App } = require('@slack/bolt');

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
  
  

  // If GET returns nothing, display button to have user add the entry
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
        "type": "actions",
        "block_id": "add_term",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Add Term"
            },
            "style": "primary",
            "action_id": "add_term"
          } 
        ]
      }
    ],
    text: `${search_term} not found, would you like to add to our Flipp dictionary?`
  });

  // If GET returns something, display answer and have options to update or delete the term
  
});

  // say() sends a message to the channel where the event was triggered
  
app.action('add_term', async ({ body, ack, respond, action }) => {
  // Acknowledge the action
  await ack();
  await respond(`The term has been added!`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();