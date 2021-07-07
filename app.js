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
      // await say(resp.data.description);

      await say({
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "plain_text",
              "text": resp.data.description
            },
          }, 
          {
            "type": "actions",
            // "block_id": "add_term",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Update"
                },
                "style": "primary",
                "action_id": "update_term"
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Delete"
                },
                "style": "danger",
                "action_id": "delete_term"
              } 
            ]
          }
        ],
        text: resp.data.description
      });
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


app.action('update_term', async ({ ack, body, client }) => {
  // Acknowledge the button request
  await ack();

  console.log(body);
  console.log('====================');

  try {
    // Call views.update with the built-in client
    const result = await client.views.open({
      // Pass the trigger id
      trigger_id: body.trigger_id,

      // View payload with updated blocks
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'update_term_modal',
        title: {
          type: 'plain_text',
          text: 'Update term'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'input_c',
            label: {
              type: 'plain_text',
              text: 'Add a new definition below:'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'dreamy_input',
              multiline: true
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        }
      }
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});


app.view('update_term_modal', async ({body, ack, payload }) => {
  ack({
    "response_action": "update",
    "view": {
      "type": "modal",
      "title": {
        "type": "plain_text",
        "text": "Updated view"
      },
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": "I've changed and I'll never be the same. You must believe me."
          }
        }
      ]
    }
  });

  const submittedValues = body.view.state.values
  console.log("---------------");

  console.log(payload);
  console.log("---------------");
  console.log(body);
  console.log("---------------");
  console.log(submittedValues)
  // do stuff with submittedValues
});




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


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
