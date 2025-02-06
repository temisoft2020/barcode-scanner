const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const barcodeList = document.getElementById('barcodeList');
const scanButton = document.getElementById('scanButton');
const logArea = document.getElementById('logArea');
const ctx = canvas.getContext('2d');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const codeReader = new ZXing.BrowserMultiFormatReader();
let isScanning = false;

// 로그 출력 함수
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}\n`;
    logArea.value += logMessage;
    logArea.scrollTop = logArea.scrollHeight; // 자동 스크롤
}

// 캔버스 크기 설정
function updateCanvasSize() {
    if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        log(`캔버스 크기 설정: ${canvas.width}x${canvas.height}`);
    }
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

// 카메라 시작 및 바코드 스캔 설정
async function startCamera() {
    try {
        // 이전 스캔 중지
        if (isScanning) {
            await codeReader.reset();
            isScanning = false;
            log('이전 스캔 중지');
        }

        // 모바일에서는 후면 카메라, 데스크톱에서는 기본 카메라 사용
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: isMobile ? 'environment' : 'user',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
            }
        };

        log('카메라 초기화 중...');

        // ZXing을 통한 비디오 스트림 설정 및 스캔
        await codeReader.decodeFromConstraints(
            constraints,
            video,
            (result, error) => {
                if (result && !scannedBarcodes.has(result.text)) {
                    // 새로운 바코드인 경우에만 추가
                    log(`새로운 바코드 인식: ${result.text}`);
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
                } else if (error) {
                    // 스캔 중 오류가 발생한 경우에만 로그 출력
                    if (error.message !== 'No MultiFormat Readers were able to detect the code.') {
                        log(`스캔 오류: ${error.message}`);
                    }
                }
            }
        );

        isScanning = true;
        scanButton.disabled = false;
        log('카메라 스캔 시작');

    } catch (err) {
        console.error('카메라 접근 오류:', err);
        log(`카메라 오류: ${err.message}`);
        alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
        scanButton.disabled = true;
    }
}

// 스캔 시작/중지 토글
async function toggleScanning() {
    if (isScanning) {
        // 스캔 중지
        await codeReader.reset();
        isScanning = false;
        scanButton.textContent = '스캔 시작';
        log('스캔 중지');
    } else {
        // 스캔 시작
        scanButton.textContent = '스캔 중지';
        log('스캔 시작');
        startCamera();
    }
}

// 이벤트 리스너 설정
scanButton.addEventListener('click', toggleScanning);

// 페이지를 나갈 때 정리
window.addEventListener('beforeunload', () => {
    if (isScanning) {
        codeReader.reset();
        log('스캔 종료');
    }
});

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    scanButton.disabled = true;  // 초기에는 버튼 비활성화
    scanButton.textContent = '스캔 시작';
    log('바코드 스캐너 초기화');
    startCamera();
}); 