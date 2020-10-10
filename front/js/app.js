const dialog = require('electron').remote.dialog;
const path = require('path');
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('btn_record');
const stopBtn = document.getElementById('btn_stop');
const fs = require('fs');

const { desktopCapturer } = require('electron');
const { Tray, nativeImage, Menu, app } = require('electron').remote;
const iconPath = path.join(__dirname, '../../build/ScreenRecorderIcon.ico');


let savePath = "";
let idDeviceSelected = "";

window.addEventListener('DOMContentLoaded', () => {
    updateInputSavePath();
    captureScreenVideoWithAudio();
    document.getElementById('saveFolder').onclick = changeSaveDir;
    $('#saveFolder').hover(function () {
        $('#saveFolder').popover('show');
      }, function () {
        $('#saveFolder').popover('hide');
      }
    );
    $('#selectRecord').hover(function () {
        $('#selectRecord').popover('show');
      }, function () {
        $('#selectRecord').popover('hide');
      }
    ).click(function (e) { 
      e.preventDefault();
      $('#selectDevice').modal('show');
      showDevices();
    });
    startBtn.onclick = startRecord;
    stopBtn.onclick = stopRecord;
    activeTray();
});

function activeTray(){
  let template = [
    {
        label: 'Record',
        click: function(){
            require('electron').remote.BrowserWindow.getFocusedWindow().minimize();
            $(startBtn).attr('disabled', true);
            $(stopBtn).removeAttr('disabled');
            startBtn.classList.add('btn-danger');
            startBtn.classList.remove('btn-outline-primary');
            startBtn.innerText = 'Recording';
            mediaRecorder.start();
        }
    },
    {
        label: 'Cut',
        click: function(){
            handleStop();
        }
    },
    {
        label: 'Stop',
        click: function(){
            $(stopBtn).attr('disabled', true);
            $(startBtn).removeAttr('disabled');
            mediaRecorder.stop();
            startBtn.classList.remove('btn-danger');
            startBtn.classList.add('btn-outline-primary');
            startBtn.innerText = 'Start';
        }
    }
  ];
  let ctxMenu = Menu.buildFromTemplate(template);
  let tray = new Tray(nativeImage.createFromPath(iconPath));
  tray.setToolTip('Screen Recorder');
  tray.setContextMenu(ctxMenu);
}

function startRecord(e = null){
  require('electron').remote.BrowserWindow.getFocusedWindow().minimize();
  $(startBtn).attr('disabled', true);
  $(stopBtn).removeAttr('disabled');
  startBtn.classList.add('btn-danger');
  startBtn.classList.remove('btn-outline-primary');
  startBtn.innerText = 'Recording';
  mediaRecorder.start();
}
function stopRecord(e = null){
  $(stopBtn).attr('disabled', true);
  $(startBtn).removeAttr('disabled');
  mediaRecorder.stop();
  startBtn.classList.remove('btn-danger');
  startBtn.classList.add('btn-outline-primary');
  startBtn.innerText = 'Start';
}

function changeSaveDir(){
  dialog.showOpenDialog({properties: ['openDirectory']}).then(path => {
    if(!path.canceled){
     fs.access(path.filePaths[0], fs.R_OK&&fs.W_OK, function(err) {
       if(err){
        alert(translate('Cannot select this folder'));
       }else{
        savePath = path.filePaths[0];
        updateInputSavePath(false);
       }
      });
    }
 });
}
function updateInputSavePath(load = true){
  if(load){
    if(localStorage.getItem("savePath") !== null){
      savePath = localStorage.getItem("savePath");
    }else {
      savePath = app.getPath("videos");
    }
  }
  if(localStorage.getItem("sourceSelect") !== null){
    idDeviceSelected = localStorage.getItem("sourceSelect");
  }
  localStorage.setItem("savePath", savePath);
  document.getElementById('saveFolder').value = savePath;
}

function showDevices(){
  getSourcesScreen({ types: ['screen'] });
  getSourcesApps({ types: ['window'] });
  //{ types: ['window'] }
}

function getSourcesScreen(options){
  desktopCapturer.getSources(options).then(async sources => {
    let sourcesList = document.querySelector('#screens')
    sourcesList.innerHTML = '';
    for (let source of sources) {
      let thumb = source.thumbnail.toDataURL()
      if (!thumb) continue
      let title = source.name.slice(0, 20)
      let itemSource = createItem(title, thumb);
      itemSource.onclick = e => {
        e.preventDefault()
        idDeviceSelected = source.id;
        localStorage.setItem('sourceSelect', idDeviceSelected);
        captureScreenVideoWithAudio();
        $('#selectDevice').modal('hide');
      };
      sourcesList.appendChild(itemSource);
    }
  });
}
function getSourcesApps(options){
  desktopCapturer.getSources(options).then(async sources => {
    let sourcesList = document.querySelector('#apps')
    sourcesList.innerHTML = '';
    for (let source of sources) {
      let thumb = source.thumbnail.toDataURL()
      if (!thumb) continue
      let title = source.name.slice(0, 20)
      let itemSource = createItem(title, thumb);
      itemSource.onclick = e => {
        e.preventDefault()
        idDeviceSelected = source.id;
        localStorage.setItem('sourceSelect', idDeviceSelected);
        captureScreenVideoWithAudio();
        $('#selectDevice').modal('hide');
      };
      sourcesList.appendChild(itemSource);
    }
  });
}
function createItem(title, thumb){
  let itemSource = document.createElement('a');
  itemSource.classList.add('btn');
          var div = document.createElement('div');
              div.classList.add('card');
              div.style = 'width: 15rem;';
                  var img = document.createElement('img');
                  img.src = thumb;
                  img.classList = [ 'card-img-top' ];
                  var div1 = document.createElement('div');
                  div1.classList = [ 'card-body' ];
                      var h5 = document.createElement('h5');
                      h5.classList = [ 'card-title' ];
                      h5.innerText = title;
                  
                  div1.appendChild(h5);
              div.appendChild(img);
              div.appendChild(div1);
          itemSource.appendChild(div);
  return itemSource;
}




/**
 * 
 * 
 * Record Screen Functions
 * 
 * 
 */

let mediaRecorder;
let blobs = [];

function captureScreenVideoWithAudio() {
  navigator.webkitGetUserMedia({
    audio: true
  }, function(audioStream) {
    navigator.webkitGetUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop'
          ,
          chromeMediaSourceId: idDeviceSelected
        }
      }
    }, handleVideoStream(audioStream), handleUserMediaError);
  }, function() {});
}

function handleVideoStream(audioStream) {
  return function(videoStream) {
    if (audioStream) {
        let audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
            videoStream.addTrack(audioTracks[0]);
        }
        videoElement.srcObject = videoStream;
        videoElement.play();
    }
    mediaRecorder = new MediaRecorder(videoStream);
    blobs = [];
    mediaRecorder.ondataavailable = function(event) {
        blobs.push(event.data);
    };
    mediaRecorder.onstop = e => { handleStop(); };
  };
}

function handleUserMediaError(e) {
  console.error('handleUserMediaError', e);
}

const { writeFile } = require('fs');

async function handleStop(){
    const blob = new Blob(blobs, {
        type: 'video/webm; codecs=vp9'
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    if(!savePath.endsWith('/'))
      savePath += '/';
    savePath += `record-${Date.now()}.webm`;
    if (savePath) {
        writeFile(savePath, buffer, () => alert("Video saved successfully!"));
    }
}