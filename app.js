const { App } = require('@slack/bolt');
const axios = require('axios');
const BACKEND_SERVER = "http://localhost:3001/api/v1/entries";
const triggerKeyword = 'WTF is ';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message(new RegExp('help', "i"), async ({ message, say }) => {
  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": 'If you type "WTF is X", I can look that up for you! Ex. wtf is brand media.'
        }
      }
    ]
  });
});


// Listens to incoming messages that contain "hello"
app.message(new RegExp(triggerKeyword, "i"), async ({ message, say }) => {
  // Extract search term
  text = message.text;
  search_term  = text.substring(triggerKeyword.length + text.search(new RegExp(triggerKeyword, "i"))).trim();

  console.log(search_term);
  // Send GET to Rails server
  let resp = null;
  try {
    resp = await getDefinition(search_term.toLowerCase());

    if (resp.status == 200){
      // await say(resp.data.description);

      console.log(resp.data);

      await say({
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*" + search_term + "*: " + resp.data.description
            },
          }, 
          {
            "type": "actions",
            "block_id": "add_term #" + resp.data.id + '#' + search_term,
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

  await createDefinition(word.toLowerCase(), body.user.username, action.value);
  await respond(`${word} has been added!`);
});

app.action('delete_term', async ({ body, ack, client, action, payload, respond }) => {

  await ack();

  const result = extractRecordId(payload.block_id);
  const id = result.id;
  const word = result.word;
  console.log("Record ID is: " + id);

  try {
    // Call views.update with the built-in client
    const result = await client.views.open({
      // Pass the trigger id
      trigger_id: body.trigger_id,

      // View payload with updated blocks
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'delete_term_modal',
        title: {
          type: 'plain_text',
          text: "Are you sure?"
        },
        blocks: [
          {
            "type": "section",
            "block_id": 'delete_modal #' + id + '#' + word,
            "text": {
              "type": "mrkdwn",
              "text": "This will permanently delete the definition for *" + word + "*. This cannot be undone."
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Confirm'
        },
        close: {
          "type": "plain_text",
          "text": "Cancel"
        },
        
      }
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});

app.view('delete_term_modal', async ({ack, payload }) => {
  const block_id = payload.blocks[0].block_id;
  const result = extractRecordId(block_id);
  const id = result.id;
  const word = result.word;
  console.log(payload);

  ack({
    "response_action": "update",
    "view": {
      "callback_id": 'delete_term_success',
      "type": "modal",
      "title": {
        "type": "plain_text",
        "text": "Deleted " + word
      },
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": word + " has changed and it will never be the same. You must believe me."
          }
        }
      ],
      close: {
        "type": "plain_text",
        "text": "Close"
      }
    }
  });

  await deleteDefinition(id);
});

app.action('update_term', async ({ ack, body, client, payload, action }) => {
  // Acknowledge the button request
  await ack();

  const result = extractRecordId(payload.block_id);
  const id = result.id;
  const word = result.word;
  console.log("Record ID is: " + id);

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
          text: "Update " + word
        },
        blocks: [
          {
            type: 'input',
            block_id: 'update_modal #' + id + '#' + word,
            label: {
              type: 'plain_text',
              text: 'Update the definition for ' + word + ' below:'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'modal_input',
              multiline: true,
              initial_value: body.message.text
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

  const block_id = payload.blocks[0].block_id;
  const result = extractRecordId(block_id);
  const id = result.id;
  const word = result.word;
  console.log("Record ID is: " + id);

  ack({
    "response_action": "update",
    "view": {
      "type": "modal",
      "title": {
        "type": "plain_text",
        "text": "Updated " + word
      },
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": word + " has changed and it will never be the same. You must believe me."
          }
        }
      ],
      close: {
        "type": "plain_text",
        "text": "Close"
      },
    }
  });

  const submittedValues = body.view.state.values

  console.log(submittedValues)
  // do stuff with submittedValues
  await updateDefinition(body.user.username, submittedValues[block_id].modal_input.value, id);
});




async function getDefinition(word) {
  targetUrl = BACKEND_SERVER+"?word="+word;

  return axios({
    method: "get",
    url: targetUrl,
  }).then(res => res);
}

async function createDefinition(word, author, description) {
  targetUrl = BACKEND_SERVER;

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

async function updateDefinition(author, description, id) {
  targetUrl = BACKEND_SERVER + "/" + id;

  return axios({
    method: "patch",
    url: targetUrl,
    data: {
      author: author,
      description: description
    }
  }).then(res => res);
}

async function deleteDefinition(id) {
  targetUrl = BACKEND_SERVER + "/" + id;

  return axios({
    method: "delete",
    url: targetUrl
  }).then(res => res);
}

function extractRecordId(block_id) {
  result = block_id.split('#');
  return {
    id: result[1],
    word: result[2]
  };
}


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();









// {
// 	"type": "modal",
// 	"title": {
// 		"type": "plain_text",
// 		"text": "My App",
// 		"emoji": true
// 	},
// 	"submit": {
// 		"type": "plain_text",
// 		"text": "Submit",
// 		"emoji": true
// 	},
// 	"close": {
// 		"type": "plain_text",
// 		"text": "Cancel",
// 		"emoji": true
// 	},
// 	"blocks": [
// 		{
// 			"type": "header",
// 			"text": {
// 				"type": "plain_text",
// 				"text": "This is a header block",
// 				"emoji": true
// 			}
// 		}
// 	]
// }