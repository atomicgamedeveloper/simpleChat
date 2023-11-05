const fs = require('fs');
const OpenAI = require('openai');
let openAIKey = ""
try {
    openAIKey = fs.readFileSync('openai.txt', 'utf8')
} catch (err) {
    console.error('Error reading file:', err);
}
const openai = new OpenAI({
    apiKey: openAIKey,
    dangerouslyAllowBrowser: true,

})

var chatHistory = document.getElementById('chatHistory');
var inputBox = document.getElementById('inputBox');
var newButton = document.getElementById('newButton');
const toggleSwitch = document.getElementById("toggleSwitch");
toggleSwitch.checked = true;


let model = "gpt-3.5-turbo";
if (toggleSwitch.checked) {
    model = "gpt-4";
} else {
    model = "gpt-3.5-turbo";
}
let messages = [];

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
            const stream = await openai.chat.completions.create({
                'model': model,
                'messages': messages,
                'stream': true,
            });
            const oldHistory = chatHistory.innerHTML;
            let addedHistory = "";
            for await (const part of stream) {
                addedHistory += part.choices[0]?.delta?.content || '';
                chatHistory.innerHTML = oldHistory + `<p>${model.toUpperCase()}: ${marked.parse(addedHistory)}</p>`;
                chatHistory.scrollTop = chatHistory.scrollHeight;
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