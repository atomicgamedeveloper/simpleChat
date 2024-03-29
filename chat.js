const { log } = require('console');
const fs = require('fs');
const OpenAI = require('openai');
let openAIKey = "";
let settings = "";
let savedChats = "";
let lastSpokenText = "";

let newChat = {
    "name": "New chat",
    "messages": []
};

let isStreamingResponse = false;

const savedPath = 'saved-chats.json'
if (!fs.existsSync(savedPath)) {
    fs.writeFileSync(savedPath, JSON.stringify([newChat]));
}

const gpt4 = "gpt-4-turbo-preview"
const gpt3 = 'gpt-3.5-turbo-0125'

const settingsPath = 'settings.json'
let newSettings = { "model": gpt4 }
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
var newChatButton = document.getElementById('newChatButton');
var sendButton = document.getElementById('sendButton');
var savedChatsElement = document.getElementById('savedChats');
const toggleSwitch = document.getElementById("toggleSwitch");

var stopReason = "init";

if (settings["model"] == gpt3) {
    model = gpt3;
    toggleSwitch.checked = false;
} else {
    model = gpt4;
    toggleSwitch.checked = true;
}
let currentDate = new Date();
let year = currentDate.getFullYear();
let month = String(currentDate.getMonth() + 1).padStart(2, '0');
let day = String(currentDate.getDate()).padStart(2, '0');

const systemMessage = {
    "role": "system",
    "content": `You are ChatGPT, a large language model trained by OpenAI, based on the ${model} architecture. Knowledge cutoff: 2023-04 Current date: ${year}-${month}-${day}.`
};

let messages = [];
let selectedChat = 0;

/*const renderer = new marked.Renderer();
renderer.paragraph = function (text) {
    return text;
};
marked.setOptions({
    renderer: renderer
});*/

function generateInnerHTMLFromMsgs(msgs) {
    var fragment = document.createDocumentFragment();

    msgs.forEach((message, index) => {
        var role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        var content = message.content;
        var partOfContext = 'insideContext';

        var messageSpan = document.createElement('span');
        messageSpan.className = `chatMessage ${partOfContext}`;
        if (index == 0 || index > 0 && msgs[index - 1].role != msgs[index].role) {
            var roleParagraph = document.createElement('p');
            roleParagraph.innerHTML = `${role}: \n`;
            messageSpan.appendChild(roleParagraph);
        }
        var paragraph = document.createElement('p');
        paragraph.innerHTML = marked.parse(content);
        messageSpan.appendChild(paragraph);

        if (role == 'Assistant') {
            var icon = document.createElement('i');
            icon.className = 'fas fa-headphones';
            icon.style.float = 'right';
            icon.style.marginLeft = '10px';

            messageSpan.addEventListener('mouseenter', function () {
                icon.style.opacity = 1;
            });

            messageSpan.addEventListener('mouseleave', function () {
                icon.style.opacity = 0;
            });

            icon.addEventListener('click', function () {
                readAloud(content);
            });

            messageSpan.appendChild(icon);
            icon.style.opacity = 0;
        }

        fragment.appendChild(messageSpan);
    });

    return fragment;
}

let allSavedChats = savedChatsElement.getElementsByClassName("logSpan");
function selectChat(index) {
    if (selectedChat == index) {
        return;
    }
    selectedChat = index;
    let chat = savedChats[index];
    messages = chat.messages;
    chatHistory.innerHTML = '';
    if (messages.length > 0) {
        chatHistory.appendChild(generateInnerHTMLFromMsgs(messages));
    }
    for (var i = 0; i < allSavedChats.length; i++) {
        allSavedChats[i].classList.remove('selected');
    }
    allSavedChats[index].classList.add("selected");
    chatHistory.scrollTop = chatHistory.scrollHeight;
};

function updateSavedChatNames() {
    savedChatsElement.innerHTML = "";
    savedChats.forEach((chat, i) => {
        if (i === selectedChat) {
            messages = chat.messages;
            chatHistory.innerHTML = '';
            if (messages.length > 0) {
                chatHistory.appendChild(generateInnerHTMLFromMsgs(messages));
            }
        };

        let logSpan = document.createElement("span");
        logSpan.className = "logSpan";
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

    let allSavedChats = document.querySelectorAll(".logSpan");
    allSavedChats[selectedChat].classList.add("selected");
}
updateSavedChatNames();

toggleSwitch.addEventListener("change", function () {
    if (model === gpt3) {
        model = gpt4;
        settings["model"] = model
        fs.writeFileSync("settings.json", JSON.stringify(settings));
    } else {
        model = gpt3;
        settings["model"] = model
        fs.writeFileSync("settings.json", JSON.stringify(settings));
    };
});

function isScrolledToBottom(el) {
    return el.scrollHeight - el.clientHeight <= el.scrollTop + 70;
}

function swapNewAndStopButton() {
    if (isStreamingResponse) {
        isStreamingResponse = false;
        if (stopReason == null) {
            sendButton.innerHTML = "Continue";
        } else {
            sendButton.innerHTML = "Send";
        }
    } else {
        isStreamingResponse = true;
        sendButton.innerHTML = "Stop Responding";
    }
}

async function sendMessage() {
    var userMessage = inputBox.value;
    var userStoppedReply = stopReason == null;
    if (userMessage || userStoppedReply) {
        if (!userStoppedReply) {
            let userSpan = document.createElement("span");
            userSpan.className = "chatMessage insideContext";
            let userName = document.createElement("p");
            userName.innerHTML = "User:\n"
            userSpan.appendChild(userName);
            let userParagraph = document.createElement("p");
            userParagraph.innerHTML = marked.parse(userMessage);
            userSpan.appendChild(userParagraph);
            chatHistory.appendChild(userSpan);
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

            let assistantSpan = document.createElement("span");
            assistantSpan.className = "chatMessage insideContext";

            let assistantName = document.createElement("p");
            assistantName.innerHTML = "Assistant:\n";
            assistantSpan.appendChild(assistantName);

            let assistantParagraph = document.createElement("p");
            assistantParagraph.classList.add("assistantMessageContent");
            assistantParagraph.innerHTML = "";
            assistantSpan.appendChild(assistantParagraph);

            chatHistory.appendChild(assistantSpan);
            let listenIcon = document.createElement("i");
            listenIcon.classList.add("fas", "fa-headphones");
            listenIcon.style.float = "right";
            listenIcon.style.marginLeft = "10px";

            listenIcon.style.opacity = 0;

            assistantSpan.addEventListener("mouseleave", function () {
                listenIcon.style.opacity = 0;
            });
            assistantSpan.appendChild(listenIcon)
        }
        chatHistory.scrollTop = chatHistory.scrollHeight;

        var context = [systemMessage, ...messages]

        let oldHistory = document.getElementsByClassName("assistantMessageContent");
        let lastMessage = oldHistory[oldHistory.length - 1];
        let oldAssistantParagraph = lastMessage.innerHTML;
        if (userStoppedReply) {
            context.push({ "role": "system", "content": "Remember, no comments or repetitions. Continue and finish your last message exactly where it ended without any repetition or commentary." });
        }
        let addedHistory = "";
        if (!isStreamingResponse) {
            swapNewAndStopButton();
        }

        const stream = await openai.chat.completions.create({
            'model': model.toLowerCase(),
            'messages': context,
            'stream': true,
        });

        for await (const part of stream) {
            if (!isStreamingResponse) {
                break;
            }
            addedHistory += part.choices[0]?.delta?.content || '';
            lastMessage.innerHTML = marked.parse(oldAssistantParagraph + addedHistory);
            if (isScrolledToBottom(chatHistory)) {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            stopReason = part.choices[0].finish_reason;
        }

        if (isScrolledToBottom(chatHistory)) {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        if (isStreamingResponse) {
            swapNewAndStopButton();
        }

        if (messages[messages.length - 1].role != "assistant") {
            messages.push({ "role": "assistant", "content": addedHistory });
        } else {
            messages[messages.length - 1].content += addedHistory;
        }

        if (selectedChat == 0 & allSavedChats[0].children[0].innerHTML === "New chat") {
            allSavedChats[0].children[0].innerHTML = "";
            const stream = await openai.chat.completions.create({
                'model': "gpt-3.5-turbo-1106",
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

        let assistantSpans = document.getElementsByClassName("chatMessage insideContext");
        let assistantSpan = assistantSpans[assistantSpans.length - 1];
        let allListenIcons = document.getElementsByTagName("i");
        let lastListenIcon = allListenIcons[allListenIcons.length - 1];
        lastListenIcon.addEventListener("click", function () {
            readAloud(lastMessage.innerText);
        });
        assistantSpan.addEventListener("mouseover", function () {
            lastListenIcon.style.opacity = 1;
        });
    }
};

inputBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isStreamingResponse) {
            stopReason = "init";
            sendMessage();
        }
    }
});

newChatButton.addEventListener('click', function () {
    if (isStreamingResponse) {
        isStreamingResponse = false;
        sendButton.innerHTML = "Send";
        stopReason = "new chat";
        return;
    }
    if (savedChats[0].messages.length != 0) {
        newChat = {
            "name": "New chat",
            "messages": []
        };
        savedChats = [newChat, ...savedChats]
        inputBox.value = "";
        fs.writeFileSync("saved-chats.json", JSON.stringify(savedChats));
    }
    if (selectedChat != 0) {
        contextStart = 0;
    }
    selectedChat = 0;
    updateSavedChatNames();
});

sendButton.addEventListener('click', function () {
    if (isStreamingResponse) {
        swapNewAndStopButton();
        return
    }
    sendMessage();
});

function readAloud(text) {
    if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (lastSpokenText == text) {
                return;
            }
        }

        var utterance = new SpeechSynthesisUtterance(text);

        utterance.pitch = 1; // Range between 0 and 2
        utterance.rate = 2; // Adjusted to 1 for a normal rate, range between 0.1 and 10
        utterance.volume = 1; // Range between 0 (silent) and 1 (loudest)

        window.speechSynthesis.speak(utterance);
        lastSpokenText = text
    } else {
        console.error('Speech synthesis is not supported in this browser.');
    }
}