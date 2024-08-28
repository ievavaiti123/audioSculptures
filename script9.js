// ref: https://github.com/bentoBAUX/Rhythm-of-Three_Threejs/blob/main/index.html
//https://www.youtube.com/watch?v=n3rkF0el0AQ&t=13s


import * as THREE from 'three';

import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const exporter = new OBJExporter(); //obj exporter library

let renderer, scene, camera, controls;  //camera settings

//audio settings
let analyser, dataArray, audio, sampleRate, binFrequency;
const amplificationFactor = 35;
const fftSize = 1024;
const minFrequency = 100;
const maxFrequency = 3000;
let startIndex, endIndex;

//gui settings
let params;

//shape settings
let cube;
let cubeSize = [400, 400, 10];
let cubeSegments = [5, 50, 5];

setup();
gui();
render();


function setup() {
    //this functions sets up the basics - camera, renderer, lights and loads the audio

    //set up scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    //setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("#ffffff");
    document.body.appendChild(renderer.domElement);

    //orbit controls
	controls = new OrbitControls(camera, renderer.domElement);
	//controls.listenToKeyEvents(window);

    // Set initial camera position
	camera.position.set( 0, 20, 600 );
	controls.update();

    //setup container/canvas
    document.getElementById("sketch-container").appendChild( renderer.domElement);
    //setup audio
    const audioListener = new THREE.AudioListener();
    camera.add( audioListener );
    const audioLoader = new THREE.AudioLoader();
    audio = new THREE.Audio(audioListener);
    audioLoader.load('audio/sample_8.wav', (buffer) => {
    audio.setBuffer(buffer);
    audio.loop = true;
    });
    analyser = new THREE.AudioAnalyser( audio, fftSize );
    console.log(analyser)
    let bufferLength = analyser.frequencyBinCount;
    dataArray = analyser.data;
    console.log(dataArray)

    //data filtering
    sampleRate = audio.context.sampleRate
    binFrequency = sampleRate / fftSize;
    //create frequency range
    startIndex = Math.floor(minFrequency / binFrequency);
    endIndex = Math.ceil(maxFrequency / binFrequency);

    console.log(`Start Index: ${startIndex}, End Index: ${endIndex}`);
  
    // AMBIENT LIGHT
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    // DIRECTIONAL LIGHT
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.x += 20
    dirLight.position.y += 20
    dirLight.position.z += 20
    dirLight.castShadow = true
    scene.add(dirLight);

    //setup shape   
    let cubegeometry = new THREE.BoxGeometry(...cubeSize, ...cubeSegments);
    let cubemesh = new THREE.MeshStandardMaterial();
    cube = new THREE.Mesh(cubegeometry, cubemesh);
    cubegeometry.verticesOriginal = cubegeometry.vertices.map(vertex => vertex.clone());
    scene.add(cube);

    //setup window resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

};

function gui() {
    //this functions sets up all the GUI elements for ease of operation

    // buttons for controlling audio
    const playPauseButton = document.getElementById('playPauseButton');
    const downloadButton = document.getElementById('downloadButton');

    // Handle button click to start audio playback
    playPauseButton.addEventListener('click', () => {
        if (audio.isPlaying) {
            audio.pause();
            playPauseButton.textContent = 'Play Audio';
            //console.log(cube);
            console.log(cube.geometry.vertices)
        } else {
            audio.play();
            playPauseButton.textContent = 'Pause Audio';
        }
    });
    downloadButton.addEventListener('click', () => {
            const myObj = exporter.parse( scene );
            downloadFile('shape.obj', myObj);
    });

    //interface for playing with the vertices
    let datGui = new dat.GUI();
        params = {
            widthSegments: 5,
            heightSegments: 50,
            depthSegments: 5,
        };

    datGui.add(params, 'widthSegments', 1, 100).step(1).onChange(updateGeometry);
    datGui.add(params, 'heightSegments', 1, 100).step(1).onChange(updateGeometry);
    datGui.add(params, 'depthSegments', 1, 100).step(1).onChange(updateGeometry);
    
}

function render() {
    //renderer animates the shape and updates the analysed audio frequencies. 

    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);

    //audio analysis
    analyser.getFrequencyData(dataArray);
    const slicedDataArray = dataArray.slice(startIndex, endIndex);  //filtered data
    //option for smoothing
    const smoothingFactor = 0.5; 
    const smoothedDataArray = smoothAudioData(slicedDataArray, smoothingFactor); 

    if (audio.isPlaying) {
        //visualising on a 'plane'
        WarpBox(cube, slicedDataArray)
        //visualising on a spehere
     
    }
    
 
};

function smoothAudioData(audioData, smoothingFactor) {
    //smooth audio data
    let smoothedData = new Float32Array(audioData.length);
    smoothedData[0] = audioData[0];
    for (let i = 1; i < audioData.length; i++) {
        smoothedData[i] = smoothingFactor * audioData[i] + (1 - smoothingFactor) * smoothedData[i - 1];
    }
    return smoothedData;
}

function updateGeometry() {
    //function for updating the cube after the vertices have been changed
    scene.remove(cube);
    let cubegeometry = new THREE.BoxGeometry(...cubeSize, params.widthSegments, params.heightSegments, params.depthSegments);
    let cubemesh = new THREE.MeshStandardMaterial();
    cube = new THREE.Mesh(cubegeometry, cubemesh);
    cubegeometry.verticesOriginal = cubegeometry.vertices.map(vertex => vertex.clone());
    scene.add(cube);
}

function WarpBox(mesh_, audioData) {
    mesh_.geometry.vertices.forEach(function (vertex, i) {
        let originalVertex = mesh_.geometry.verticesOriginal[i]; 
        //have the visualisation on both sides rather than one
        // if (vertex.z > 0) { 
            // Normalize the frequency data
            let frequencyValue = audioData[i % audioData.length] / fftSize;
            let amplifiedValue = frequencyValue * amplificationFactor;
            // Apply the displacement to the z coordinate directly
            vertex.copy(originalVertex);
            vertex.z += amplifiedValue;
        //}
    });

    // updated vertices and normals
    mesh_.geometry.verticesNeedUpdate = true;
    mesh_.geometry.normalsNeedUpdate = true;
    mesh_.geometry.computeVertexNormals();
    mesh_.geometry.computeFaceNormals();
}

function downloadFile(filename, content) {
    //function for downloading the file
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    a.dispatchEvent(event);

    URL.revokeObjectURL(url);
  }
