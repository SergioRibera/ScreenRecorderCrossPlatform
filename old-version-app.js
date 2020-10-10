const { desktopCapturer } = require('electron');
const dialog = require('electron').remote.dialog;

const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');

videoSelectBtn.onclick = getVideoSources;
startBtn.onclick = e => {
    mediaRecorder.start();
    startBtn.classList.add('btn-danger');
    startBtn.classList.remove('btn-outline-primary');
    startBtn.innerText = 'Recording';
};
stopBtn.onclick = e => {
    mediaRecorder.stop();
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-outline-primary');
    startBtn.innerText = 'Start';
};

async function getVideoSources(){
    const inputSources = await desktopCapturer.getSources({
        types: [ 'window', 'screen' ]
    });
    const inputOptions = document.getElementById('options-source');
    inputOptions.innerHTML = '';
    inputSources.forEach(s => {
        var btn = document.createElement('button');
        btn.classList.add('dropdown-item');
        btn.type = 'button';
        btn.onclick = (e) => { selectSource(s); };
        btn.innerText = s.name;
        inputOptions.appendChild(btn);
    });
}

let mediaRecorder;
const recordedChunks = [];

async function selectSource(source){
    videoSelectBtn.innerText = source.name;
    const constrains = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constrains);
    videoElement.srcObject = stream;
    videoElement.play();

    const options = { mimeType: 'video/webm; codecs=vp9' };
    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e){
    recordedChunks.push(e.data);
}

const { writeFile } = require('fs');

async function handleStop(e){
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save Video',
        defaultPath: `vid-${Date.now()}.webm`
    });
    if (filePath) {
        writeFile(filePath, buffer, () => console.log('video saved successfully!'));
    }
}