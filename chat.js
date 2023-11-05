const fs = require('fs');
const OpenAI = require('openai');
let openAIKey = "";
let settings = "";
try {
    openAIKey = fs.readFileSync('openai.txt', 'utf8')
    settings = fs.readFileSync('settings.json', 'utf-8');
    settings = JSON.parse(settings);
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

if (settings["model"] == "gpt-3.5-turbo") {
    model = "GPT-3.5-turbo";
    toggleSwitch.checked = false;
} else {
    model = "GPT-4";
    toggleSwitch.checked = true;
}
let currentDate = new Date();
let year = currentDate.getFullYear();
let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 because getMonth() is zero-based
let day = String(currentDate.getDate()).padStart(2, '0');

let messages = [{
    "role": "system",
    "content": `You are ChatGPT, a large language model trained by OpenAI, based on the ${model} architecture. Knowledge cutoff: 2023-04 Current date: ${year}-${month}-${day}.`
}];
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
        settings["model"] = model
        fs.writeFileSync("settings.json", JSON.stringify(settings));
    } else {
        console.log("gpt-4");
        model = 'gpt-4';
        settings["model"] = model
        fs.writeFileSync("settings.json", JSON.stringify(settings));
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
                'model': model.toLowerCase(),
                'messages': messages,
                'stream': true,
            });
            const oldHistory = chatHistory.innerHTML;
            let addedHistory = "";
            for await (const part of stream) {
                addedHistory += part.choices[0]?.delta?.content || '';
                chatHistory.innerHTML = oldHistory + `<p>${model}: ${marked.parse(addedHistory)}</p>`;
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