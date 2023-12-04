const { log } = require('console');
const fs = require('fs');
const OpenAI = require('openai');
let openAIKey = "";
let settings = "";
let savedChats = "";

let newChat = {
    "name": "New chat",
    "messages": []
};

let isStreamingResponse = false;

const savedPath = 'saved-chats.json'
if (!fs.existsSync(savedPath)) {
    fs.writeFileSync(savedPath, JSON.stringify([newChat]));
}

const settingsPath = 'settings.json'
let newSettings = { "model": "GPT-4-1106-preview" }
if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings));
}

try {
    openAIKey = fs.readFileSync('openai.txt', 'utf8')
    settings = fs.readFileSync('settings.json', 'utf-8');
    settings = JSON.parse(settings);
    savedChats = fs.readFileSync('saved-chats.json', 'utf-8');

    if (savedChats == "" || savedChats == "[]") {
        savedChats = [newChat];
        fs.writeFileSync(savedPath, JSON.stringify(savedChats));
    } else {
        savedChats = JSON.parse(savedChats);
    }

    if (savedChats[0].name != "New chat") {
        savedChats = [newChat, ...savedChats];
    }
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
let selectedChat = 0;

function generateInnerHTMLFromMsgs(msgs) {
    var history = ""
    msgs.forEach(message => {
        var role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        var content = message.content;
        history += `<p>${role}:${marked.parse(content)}</p>`;
    })
    return history
}

let allSavedChats = savedChatsElement.getElementsByClassName("logSpan");
function selectChat(index) {
    selectedChat = index; // this could be AFTER removing the class to not go over all
    //savedChats = JSON.parse(fs.readFileSync('saved-chats.json', 'utf-8'));
    let chat = savedChats[index];
    messages = chat.messages;
    chatHistory.innerHTML = generateInnerHTMLFromMsgs(messages);
    for (var i = 0; i < allSavedChats.length; i++) {
        allSavedChats[i].classList.remove('selected');
    }
    allSavedChats[index].classList.add("selected");
};

function updateSavedChatNames() {
    savedChatsElement.innerHTML = "";
    //savedChats = JSON.parse(fs.readFileSync('saved-chats.json', 'utf-8'));
    //console.log(`Right off: ${savedChats}`);
    savedChats.forEach((chat, i) => {
        if (i === selectedChat) {
            console.log(i);
            messages = chat.messages;
            chatHistory.innerHTML = generateInnerHTMLFromMsgs(messages);
        };

        let logSpan = document.createElement("span");
        logSpan.className = "logSpan"; // Use class instead of id
        let paragraph = document.createElement("p");
        paragraph.textContent = chat.name;
        logSpan.appendChild(paragraph);
        let icon = document.createElement("i");
        icon.classList.add("fas", "fa-times");
        icon.style.color = "white";
        icon.addEventListener("click", function () {
            if (this.parentElement.classList.contains("selected") && savedChats.length > 1) {
                savedChats.splice(selectedChat, 1);
                fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
                selectChat(0);
                updateSavedChatNames();
            }
        });
        logSpan.appendChild(icon);
        paragraph.addEventListener("click", function () {
            selectChat(i);
        });
        savedChatsElement.appendChild(logSpan);
    });

    // Use a class selector to apply the selected class to the correct element
    let allSavedChats = document.querySelectorAll(".logSpan");
    allSavedChats[selectedChat].classList.add("selected");
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

function isScrolledToBottom(el) {
    return el.scrollHeight - el.clientHeight <= el.scrollTop + 50;
}

function swapNewAndStopButton() {
    if (isStreamingResponse) {
        isStreamingResponse = false;
        newButton.innerHTML = "New chat";
    } else {
        isStreamingResponse = true;
        newButton.innerHTML = "Stop Responding";
    }
}

inputBox.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var userMessage = inputBox.value;
        if (userMessage) {
            chatHistory.innerHTML += `<p>User: ${marked.parse(userMessage)}</p>`;
            messages.push({ "role": "user", "content": userMessage });
            inputBox.value = '';
            chatHistory.scrollTop = chatHistory.scrollHeight;
            if (selectedChat != 0) {
                let curChat = savedChats.splice(selectedChat, 1)[0];
                if (savedChats[0].name == "New chat") {
                    savedChats.splice(0, 1);
                }
                savedChats = [curChat, ...savedChats];
                selectChat(0);
                updateSavedChatNames();
            }
            const stream = await openai.chat.completions.create({
                'model': model.toLowerCase(),
                'messages': [systemMessage, ...messages],
                'stream': true,
            });
            const oldHistory = chatHistory.innerHTML;
            let addedHistory = "";
            swapNewAndStopButton();
            newButton.innerHTML = "Stop Responding";
            for await (const part of stream) {
                if (!isStreamingResponse) {
                    break;
                }
                addedHistory += part.choices[0]?.delta?.content || '';
                chatHistory.innerHTML = oldHistory + `<p>Assistant: ${marked.parse(addedHistory)}</p>`;
                if (isScrolledToBottom(chatHistory)) {
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }
            }
            if (isStreamingResponse) {
                swapNewAndStopButton();
            }
            if (isScrolledToBottom(chatHistory)) {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            messages.push({ "role": "assistant", "content": addedHistory });

            if (selectedChat == 0 & allSavedChats[0].children[0].innerHTML === "New chat") {
                allSavedChats[0].children[0].innerHTML = "";
                const stream = await openai.chat.completions.create({
                    'model': "gpt-3.5-turbo",
                    'messages': [{
                        "role": "user", "content": `Instruction: Name the chat from the last message\n
Example chat: "how to make pink cake"\n
Example title: Pink Cake Recipe\n
Chat: "${userMessage}"\n
Title:`,
                    }],
                    'max_tokens': 15,
                    'stream': true,
                });
                for await (const part of stream) {
                    allSavedChats[0].children[0].innerHTML += part.choices[0]?.delta?.content || '';
                }
                savedChats[0].name = allSavedChats[0].children[0].innerHTML;
            }
            savedChats[selectedChat] = { "name": savedChats[0].name, "messages": messages };
            fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
        }
    }
});

newButton.addEventListener('click', function () {
    if (isStreamingResponse) {
        swapNewAndStopButton();
        return
    }

    if (savedChats[0].name != "New chat" && savedChats[selectedChat].messages != []) {
        console.log("Making a new chat.");
        newChat = {
            "name": "New chat",
            "messages": []
        };
        console.log(newChat)
        savedChats = [newChat, ...savedChats]
        inputBox.value = "";
        fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
        selectedChat = 0;
        updateSavedChatNames();
    } else {
        selectedChat = 0;
        console.log("No need for a new chat.");
        updateSavedChatNames();
    }
});