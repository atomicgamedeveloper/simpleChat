var chatHistory = document.getElementById('chatHistory');
var inputBox = document.getElementById('inputBox');
var newButton = document.getElementById('newButton');
const toggleSwitch = document.getElementById("toggleSwitch");
toggleSwitch.checked = true;
const fs = require('fs');
let openAIKey = ""
try {
    openAIKey = fs.readFileSync('openai.txt', 'utf8')
} catch (err) {
    console.error('Error reading file:', err);
}

let model = "gpt-3.5-turbo";
if (toggleSwitch.checked) {
    model = "gpt-4";
} else {
    model = "gpt-3.5-turbo";
}
let messages = [];

async function fetchGPTStream(messages, model) {
    try {
        const stream = await axios.post('https://api.openai.com/v1/chat/completions', {
            'model': model,
            'messages': messages,
            'temperature': 1,
            'stream': true,
        }, {
            headers: {
                'Authorization': `Bearer ${openAIKey}`,
                'Content-Type': 'application/json',
            }
        });
        return stream;
    } catch (error) {
        console.error(error);
    }
};

async function fetchGPTResponse(messages, model) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            'model': model,
            'messages': messages,
            'temperature': 1
        }, {
            headers: {
                'Authorization': `Bearer ${openAIKey}`,
                'Content-Type': 'application/json',
            }
        });
        const msg = response.data.choices[0].message.content
        console.log(response);
        return msg;
    } catch (error) {
        console.error(error);
    }
};

toggleSwitch.addEventListener("change", function () {
    if (model === "gpt-4") {
        console.log("gpt-3.5-turbo");
        model = 'gpt-3.5-turbo';
    } else {
        console.log("gpt-4");
        model = 'gpt-4';
    };
});

inputBox.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var userMessage = inputBox.value;
        if (userMessage) {
            chatHistory.innerHTML += `<p>User: ${marked.parse(userMessage)}</p>`;
            messages.push({ "role": "user", "content": userMessage });
            inputBox.value = '';
            chatHistory.scrollTop = chatHistory.scrollHeight;
            const botStream = fetchGPTStream(messages, model);
            const oldHistory = chatHistory.innerHTML;
            let addedHistory = "";
            for await (const part of botStream) {
                addedHistory += part;
                chatHistory.innerHTML = oldHistory + `<p>${model.toUpperCase()}: ${marked.parse(addedHistory)}</p>`;
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
            messages.push({ "role": "assistant", "content": addedHistory });
        }
    }
});

newButton.addEventListener('click', function () {
    console.log("Reloaded!");
    inputBox.value = "";
    location.reload();
});