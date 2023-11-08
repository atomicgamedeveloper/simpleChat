const fs = require('fs');
const OpenAI = require('openai');
let openAIKey = "";
let settings = "";
let savedChats = "";

try {
    openAIKey = fs.readFileSync('openai.txt', 'utf8')
    settings = fs.readFileSync('settings.json', 'utf-8');
    settings = JSON.parse(settings);
    savedChats = fs.readFileSync('saved-chats.json', 'utf-8');
    savedChats = JSON.parse(savedChats);
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
var savedChatsElement = document.getElementById('savedChats');
const toggleSwitch = document.getElementById("toggleSwitch");

if (settings["model"] == "GPT-3.5-turbo") {
    model = "GPT-3.5-turbo";
    toggleSwitch.checked = false;
} else {
    model = "GPT-4-1106-preview";
    toggleSwitch.checked = true;
}
let currentDate = new Date();
let year = currentDate.getFullYear();
let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 because getMonth() is zero-based
let day = String(currentDate.getDate()).padStart(2, '0');

const systemMessage = {
    "role": "system",
    "content": `You are ChatGPT, a large language model trained by OpenAI, based on the ${model} architecture. Knowledge cutoff: 2023-04 Current date: ${year}-${month}-${day}.`
};

let messages = [];
let selectedChat = 0; //maybe -1 to begin with

function selectChat(index) {
    selectedChat = index;
    let chat = savedChats[index];
    messages = chat.messages;
    chatHistory.innerHTML = chat.chatHistory;
};

let allSavedChats = savedChatsElement.getElementsByTagName("p");
function updateSavedChatNames() {
    savedChatsElement.innerHTML = "";
    var i = 0;
    while (i < savedChats.length) {
        let chat = savedChats[i];
        if (i == selectedChat) {
            messages = chat.messages;
            chatHistory.innerHTML = chat.chatHistory;
        }
        let name = `<p>${chat.name}</p>`;
        savedChatsElement.innerHTML += name;
        i = i + 1;
    }

    allSavedChats = savedChatsElement.getElementsByTagName("p");
    for (let i = 0; i < allSavedChats.length; i++) {
        let chat = allSavedChats[i];
        chat.addEventListener("click", function () {
            selectChat(i);
        });
    }
}
updateSavedChatNames();

toggleSwitch.addEventListener("change", function () {
    if (model === "GPT-3.5-turbo") {
        console.log("GPT-4-1106-preview");
        model = 'GPT-4-1106-preview';
        settings["model"] = model
        fs.writeFileSync("settings.json", JSON.stringify(settings));
    } else {
        console.log("GPT-3.5-turbo");
        model = 'GPT-3.5-turbo';
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
                'messages': [systemMessage, ...messages],
                'stream': true,
            });
            const oldHistory = chatHistory.innerHTML;
            let addedHistory = "";
            for await (const part of stream) {
                addedHistory += part.choices[0]?.delta?.content || '';
                chatHistory.innerHTML = oldHistory + `<p>${model}: ${marked.parse(addedHistory)}</p>`;
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            console.log(allSavedChats[0].innerHTML)
            if (allSavedChats[0].innerHTML === "New chat") {
                allSavedChats[0].innerHTML = "";
                const stream = await openai.chat.completions.create({
                    'model': "gpt-3.5-turbo",
                    'messages': [{
                        "role": "user", "content": `Instruction: Name chat from message\nChat: how to make pink cake\nName: Pink Cake Recipe\nChat: ${userMessage}\nName:`,
                    }],
                    'stream': true,
                });
                for await (const part of stream) {
                    allSavedChats[0].innerHTML += part.choices[0]?.delta?.content || '';
                }
                savedChats[0].name = allSavedChats[0].innerHTML;
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
            messages.push({ "role": "assistant", "content": addedHistory });
            savedChats[selectedChat] = { "name": savedChats[0].name, "messages": messages, "chatHistory": chatHistory.innerHTML };
            fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
        }
    }
});

newButton.addEventListener('click', function () {
    if (savedChats[selectedChat].chatHistory != "") {
        console.log("Making a new chat.");
        let newChat = {
            "name": "New chat",
            "messages": [],
            "chatHistory": ""
        };
        savedChats = [newChat, ...savedChats]
        inputBox.value = "";
        fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
        selectedChat = 0;
        updateSavedChatNames();
    } else {
        console.log("No need for a new chat.");
    }
});