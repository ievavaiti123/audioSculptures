// https://github.com/bentoBAUX/Rhythm-of-Three_Threejs/blob/main/index.html

let noise = new SimplexNoise();
// let audio = document.getElementById('audio');




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
audioLoader.load('https://cdn.glitch.global/4c75b1b0-7fb8-4f94-a4f8-5790a11582f7/Yushh%20-%20Look%20Mum%20No%20Hands%20-%2001%20Look%20Mum%20No%20Hands.mp3?v=1694877600875', (buffer) => {
    audio.setBuffer(buffer);
});

// Create a button element reference
const playPauseButton = document.getElementById('playPauseButton');

// Handle button click to start audio playback
playPauseButton.addEventListener('click', () => {
    if (audio.isPlaying) {
        audio.pause();
        playPauseButton.textContent = 'Play Audio';
    } else {
        audio.play();
        playPauseButton.textContent = 'Pause Audio';
    }
});
//     //play function
//     const playPauseButton = document.getElementById('playPauseButton');

//     playPauseButton.addEventListener('click', () => {

//         if (isPlaying(audio)) {
//             console.log("Pause");
//             audio.pause();
//             playPauseButton.textContent = "Play";
//         } else {
//             console.log("Play");
//             audio.play();
//             playPauseButton.textContent = "Pause";
//         }
//     });

//     function isPlaying(audioIn) {
//         return !audioIn.paused;
//     }


    //analyser
    
    // let context = new AudioContext();
    // let src = context.createMediaElementSource(audio);
    // let analyser = context.createAnalyser();
    // src.connect(analyser);
    // analyser.connect(context.destination);
    // analyser.fftSize = 512;
    // let bufferLength = analyser.frequencyBinCount;
    // let dataArray = new Uint8Array(bufferLength);

    let analyser = new THREE.AudioAnalyser( audio, 512 );
    console.log(analyser)
    let bufferLength = analyser.frequencyBinCount;
    let dataArray = analyser.data;
  console.log(dataArray)
  
    // AMBIENT LIGHT
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    // DIRECTIONAL LIGHT
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
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


    let geometry = new THREE.SphereGeometry(30, 50, 50);
    // geometry.positionData = [];
    // let v3 = new THREE.Vector3();
    // for (let i = 0; i < geometry.attributes.position.count; i++){
    //     v3.fromBufferAttribute(geometry.attributes.position, i);
    //     geometry.positionData.push(v3.clone());
    // }
    //let wireframe = new THREE.EdgesGeometry(geometry);
    //let material = new THREE.MeshLambertMaterial({ color: 0x383838, wireframe: true });



    let material = new THREE.ShaderMaterial({
        uniforms: {
            color1: {
                value: new THREE.Color("#fff1eb")
            },
            color2: {
                value: new THREE.Color("#3d3d3d")
            }
        },
        vertexShader: `
          letying vec2 vUv;
      
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          
          letying vec2 vUv;
          
          void main() {
            gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
          }
        `,
        //wireframe: true
    });

    // let ambientLight = new THREE.AmbientLight(0xffffff);
    // //scene.add(ambientLight);

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


        WarpBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));


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