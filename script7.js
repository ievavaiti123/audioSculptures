// ref: https://github.com/bentoBAUX/Rhythm-of-Three_Threejs/blob/main/index.html
//https://www.youtube.com/watch?v=n3rkF0el0AQ&t=13s


import * as THREE from 'three';

import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

let noise = new SimplexNoise();


const exporter = new OBJExporter();

startViz();


function startViz() {
  
    //webgl
    let scene = new THREE.Scene();
    let group = new THREE.Group();
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    scene.add(camera);


    let renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("#ffffff");

    document.getElementById("sketch-container").appendChild( renderer.domElement );


const audioListener = new THREE.AudioListener();
camera.add( audioListener );
const audioLoader = new THREE.AudioLoader();
const audio = new THREE.Audio(audioListener);
audioLoader.load('audio/Demo_beat.mp3', (buffer) => {
    audio.setBuffer(buffer);
});

// Create a button element reference
const playPauseButton = document.getElementById('playPauseButton');

const downloadButton = document.getElementById('downloadButton');

// Handle button click to start audio playback
playPauseButton.addEventListener('click', () => {
    if (audio.isPlaying) {
        audio.pause();
        playPauseButton.textContent = 'Play Audio';
        console.log(ball);
        // console.log(ball.geometry.vertices)


       
    } else {
        audio.play();
        playPauseButton.textContent = 'Pause Audio';
    }
});

downloadButton.addEventListener('click', () => {
        const myObj = exporter.parse( scene );
        downloadFile('shape.obj', myObj);
});



    let analyser = new THREE.AudioAnalyser( audio, 512 );
    console.log(analyser)
    let bufferLength = analyser.frequencyBinCount;
    let dataArray = analyser.data;
  console.log(dataArray)
  
    // AMBIENT LIGHT
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    // DIRECTIONAL LIGHT
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.x += 20
    dirLight.position.y += 20
    dirLight.position.z += 20
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    const d = 10;
    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;
    dirLight.position.z = -25;

    let target = new THREE.Object3D();
    target.position.z = -40;
    dirLight.target = target;
    dirLight.target.updateMatrixWorld();

    dirLight.shadow.camera.lookAt(0, 0, -20);
    scene.add(dirLight);

    // TEXTURES
    const textureLoader = new THREE.TextureLoader();

    const waterBaseColor = textureLoader.load("./textures/Water_002_COLOR.jpg");
    const waterNormalMap = textureLoader.load("./textures/Water_002_NORM.jpg");
    const waterHeightMap = textureLoader.load("./textures/Water_002_DISP.png");
    const waterRoughness = textureLoader.load("./textures/Water_002_ROUGH.jpg");
    const waterAmbientOcclusion = textureLoader.load("./textures/Water_002_OCC.jpg");


    let geometry = new THREE.SphereGeometry(20, 100, 100);


    let ball = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        map: waterBaseColor,
        normalMap: waterNormalMap,
        displacementMap: waterHeightMap, displacementScale: 0.01,
        roughnessMap: waterRoughness, roughness: 0,
        aoMap: waterAmbientOcclusion
    }));
    ball.receiveShadow = true;
    ball.castShadow = true;
    // ball.position.set(0, 0, 0);

    group.add(ball);
    scene.add(group);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    function render() {
        analyser.getFrequencyData(dataArray);

        let lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
        let upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

        let overallAvg = avg(dataArray);
        let lowerMax = max(lowerHalfArray);
        let lowerAvg = avg(lowerHalfArray);
        let upperMax = max(upperHalfArray);
        let upperAvg = avg(upperHalfArray);

        let lowerMaxFr = lowerMax / lowerHalfArray.length;
        let lowerAvgFr = lowerAvg / lowerHalfArray.length;
        let upperMaxFr = upperMax / upperHalfArray.length;
        let upperAvgFr = upperAvg / upperHalfArray.length;

        ball.rotation.x += 0.001;
        ball.rotation.y += 0.005;
        ball.rotation.z += 0.002;

        if (audio.isPlaying) {
            console.log("yes");
            WarpBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 1), modulate(upperAvgFr, 0, 1, 0, 4));
        }
        


        requestAnimationFrame(render);
        renderer.render(scene, camera);
    };

    function WarpBall(mesh, bassFr, treFr) {
        mesh.geometry.vertices.forEach(function (vertex, i) {
            let offset = mesh.geometry.parameters.radius;
            let amp = 5;
            let time = window.performance.now();
            vertex.normalize();
            let rf = 0.00001;
            let distance = (offset + bassFr) + noise.noise3D(vertex.x + time * rf * 6, vertex.y + time * rf * 7, vertex.z + time * rf * 8) * amp * treFr;
            vertex.multiplyScalar(distance);
        });
        mesh.geometry.verticesNeedUpdate = true;
        mesh.geometry.normalsNeedUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeFaceNormals();
    }

    render();
};

//helper functions
function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    let fr = fractionate(val, minVal, maxVal);
    let delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr) {
    let total = arr.reduce(function (sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); })
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Trigger a click event to initiate the download
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    a.dispatchEvent(event);
    
    // Clean up resources
    URL.revokeObjectURL(url);
  }
