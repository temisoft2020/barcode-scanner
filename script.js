const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const barcodeList = document.getElementById('barcodeList');
const ctx = canvas.getContext('2d');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const codeReader = new ZXing.BrowserMultiFormatReader();
let isScanning = false;

// 캔버스 크기 설정
function updateCanvasSize() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

// 바코드 영역 표시
function drawBarcodeBox(location) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;

    // 바코드 위치 좌표
    const points = location.resultPoints;
    
    // 바운딩 박스 계산
    const minX = Math.min(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y));
    
    // 박스 그리기
    ctx.beginPath();
    ctx.rect(minX, minY, maxX - minX, maxY - minY);
    ctx.stroke();

    // 3초 후 박스 지우기
    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 3000);
}

// 카메라 시작
async function startCamera() {
    try {
        const constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // 비디오 메타데이터 로드 시 캔버스 크기 설정
        video.addEventListener('loadedmetadata', () => {
            updateCanvasSize();
            video.play().catch(console.error);
        });
        
        // 비디오가 실제로 재생되기 시작할 때 스캔 시작
        video.addEventListener('playing', () => {
            if (!isScanning) {
                startScanning();
            }
        });
        
    } catch (err) {
        console.error('카메라 접근 오류:', err);
        alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
    }
}

// 바코드 스캔 시작
function startScanning() {
    if (isScanning) return;
    isScanning = true;

    const scanInterval = setInterval(async () => {
        if (!video.paused && !video.ended && video.readyState === 4) {
            try {
                const result = await codeReader.decodeFromVideoElement(video);
                if (result && !scannedBarcodes.has(result.text)) {
                    // 새로운 바코드인 경우에만 추가
                    scannedBarcodes.add(result.text);
                    
                    // UI에 바코드 추가
                    const li = document.createElement('li');
                    li.className = 'barcode-item';
                    li.textContent = `${result.text}`;
                    barcodeList.insertBefore(li, barcodeList.firstChild);

                    // 바코드 영역 표시
                    if (result.resultPoints) {
                        drawBarcodeBox(result);
                    }
                }
            } catch (err) {
                // 바코드를 찾지 못한 경우 무시
            }
        }
    }, 200); // 0.2초마다 스캔

    // 페이지를 나갈 때 정리
    window.addEventListener('beforeunload', () => {
        clearInterval(scanInterval);
        isScanning = false;
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    });
}

// 페이지 로드 시 카메라 시작
window.addEventListener('load', startCamera); 