const { app, BrowserWindow } = require('electron');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //preload: path.join(__dirname, 'preload.js')
      plugins: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
  //win.loadURL('https://open.spotify.com/')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

async function main() {
  // Replace 'YOUR_PROMPT_HERE' with the text you want to send to ChatGPT
  const my_response = await fetchGPT3Response('I have 3 balls.The first I put on the table.Then I put the 2nd ball on top of the 1st.Finally, I put the 3rd ball to the left of the 2nd ball.What is the very next thing that must follow for each of the 3 balls ?');
  console.log(my_response);

  const generatedText = my_response.choices[0].message.content;
  console.log(generatedText);
}

//main();