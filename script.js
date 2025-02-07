const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const barcodeList = document.getElementById('barcodeList');
const scanButton = document.getElementById('scanButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const cameraSelect = document.getElementById('cameraSelect');
const logArea = document.getElementById('logArea');
const debugInfo = document.getElementById('debugInfo');
const imageList = document.getElementById('imageList');
const ctx = canvas.getContext('2d');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const codeReader = new ZXing.BrowserMultiFormatReader();
let isScanning = false;
let currentCamera = null;

// 디버그 정보 업데이트
function updateDebugInfo() {
    const info = [
        `User Agent: ${navigator.userAgent}`,
        `Screen: ${window.innerWidth}x${window.innerHeight}`,
        `Is Mobile: ${/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}`,
        `Video Size: ${video.videoWidth}x${video.videoHeight}`,
        `Scanned Codes: ${scannedBarcodes.size}`
    ].join('\n');
    debugInfo.textContent = info;
}

// 로그 출력 함수
function log(message) {
    try {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}\n`;
        logArea.value += logMessage;
        logArea.scrollTop = logArea.scrollHeight; // 자동 스크롤
        updateDebugInfo();
    } catch (err) {
        console.error('로그 출력 오류:', err);
    }
}

// 캔버스 크기 설정
function updateCanvasSize() {
    try {
        if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            log(`캔버스 크기 설정: ${canvas.width}x${canvas.height}`);
            updateDebugInfo();
        }
    } catch (err) {
        console.error('캔버스 크기 설정 오류:', err);
        log(`캔버스 오류: ${err.message}`);
    }
}

// 바코드 영역 표시
function drawBarcodeBox(location) {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;

        const points = location.resultPoints;
        
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        ctx.beginPath();
        ctx.rect(minX, minY, maxX - minX, maxY - minY);
        ctx.stroke();

        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 3000);
    } catch (err) {
        console.error('바코드 박스 그리기 오류:', err);
        log(`그리기 오류: ${err.message}`);
    }
}

// 바코드 영역 캡처 함수
async function captureBarcode(location) {
    try {
        // 비디오 프레임을 캡처할 임시 캔버스 생성
        const captureCanvas = document.createElement('canvas');
        const captureCtx = captureCanvas.getContext('2d');
        
        // 캔버스 크기 설정
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        
        // 현재 비디오 프레임을 캔버스에 그리기
        captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        
        // 바코드 영역 좌표 계산 (여백 추가)
        const points = location.resultPoints;
        const padding = 50; // 여백을 50픽셀로 증가
        const minX = Math.max(0, Math.min(...points.map(p => p.x)) - padding);
        const minY = Math.max(0, Math.min(...points.map(p => p.y)) - padding);
        const maxX = Math.min(captureCanvas.width, Math.max(...points.map(p => p.x)) + padding);
        const maxY = Math.min(captureCanvas.height, Math.max(...points.map(p => p.y)) + padding);
        const width = maxX - minX;
        const height = maxY - minY;
        
        // 바코드 영역만 크롭
        const imageData = captureCtx.getImageData(minX, minY, width, height);
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.putImageData(imageData, 0, 0);
        
        // 캔버스를 이미지 URL로 변환 (품질 향상)
        const imageUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);
        log('바코드 이미지 캡처 완료');
        return imageUrl;
    } catch (err) {
        console.error('이미지 캡처 오류:', err);
        log(`캡처 오류: ${err.message}`);
        return null;
    }
}

// 카메라 목록 업데이트
async function updateCameraList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // 카메라 선택 옵션 초기화
        cameraSelect.innerHTML = '<option value="">카메라 선택...</option>';
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `카메라 ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        // 카메라가 2개 이상일 때만 선택 UI 표시
        if (videoDevices.length > 1) {
            cameraSelect.style.display = 'inline-block';
            switchCameraButton.style.display = 'inline-block';
        } else {
            cameraSelect.style.display = 'none';
            switchCameraButton.style.display = 'none';
        }

        return videoDevices;
    } catch (err) {
        console.error('카메라 목록 업데이트 오류:', err);
        log(`카메라 목록 오류: ${err.message}`);
        return [];
    }
}

// 카메라 시작 및 바코드 스캔 설정
async function startCamera(deviceId = null) {
    try {
        if (isScanning) {
            await codeReader.reset();
            isScanning = false;
            log('이전 스캔 중지');
        }

        const videoDevices = await updateCameraList();
        
        log('=== 사용 가능한 카메라 목록 ===');
        videoDevices.forEach((device, index) => {
            log(`카메라 ${index + 1}: ${device.label || '이름 없음'} (${device.deviceId})`);
        });
        log('==========================');

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
            video: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
            }
        };

        // deviceId가 지정된 경우 해당 카메라 사용
        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
            currentCamera = deviceId;
        } else {
            // 처음 실행 시 모바일이면 후면 카메라, 데스크톱이면 기본 카메라
            constraints.video.facingMode = isMobile ? 'environment' : 'user';
        }

        log('카메라 초기화 중...');
        log(`디바이스 정보: ${isMobile ? '모바일' : '데스크톱'}`);

        await codeReader.decodeFromConstraints(
            constraints,
            video,
            async (result, error) => {
                if (result && !scannedBarcodes.has(result.text)) {
                    log(`새로운 바코드 인식: ${result.text}`);
                    scannedBarcodes.add(result.text);
                    
                    // 바코드 텍스트 추가
                    const li = document.createElement('li');
                    li.className = 'barcode-item';
                    const textDiv = document.createElement('div');
                    textDiv.className = 'barcode-text';
                    textDiv.textContent = result.text;
                    li.appendChild(textDiv);
                    barcodeList.insertBefore(li, barcodeList.firstChild);
                    
                    // 이미지 캡처 및 표시
                    if (result.resultPoints) {
                        drawBarcodeBox(result);
                        const imageUrl = await captureBarcode(result);
                        if (imageUrl) {
                            log('이미지 캡처 성공');
                            const capturedItem = document.createElement('div');
                            capturedItem.className = 'captured-item';
                            
                            const img = document.createElement('img');
                            img.src = imageUrl;
                            img.className = 'captured-image';
                            img.alt = '바코드 이미지';
                            img.onerror = () => {
                                log('이미지 로드 실패');
                                capturedItem.remove();
                            };
                            img.onload = () => {
                                log('이미지 로드 성공');
                            };
                            
                            const capturedText = document.createElement('div');
                            capturedText.className = 'captured-text';
                            capturedText.textContent = result.text;
                            
                            capturedItem.appendChild(img);
                            capturedItem.appendChild(capturedText);
                            imageList.insertBefore(capturedItem, imageList.firstChild);
                        } else {
                            log('이미지 캡처 실패');
                        }
                    }
                    
                    updateDebugInfo();
                } else if (error && error.message !== 'No MultiFormat Readers were able to detect the code.') {
                    log(`스캔 오류: ${error.message}`);
                }
            }
        );

        isScanning = true;
        scanButton.disabled = false;
        log('카메라 스캔 시작');
        updateDebugInfo();

    } catch (err) {
        console.error('카메라 접근 오류:', err);
        log(`카메라 오류: ${err.message}`);
        alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
        scanButton.disabled = true;
        updateDebugInfo();
    }
}

// 다음 카메라로 전환
async function switchToNextCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length <= 1) {
            log('전환 가능한 카메라가 없습니다.');
            return;
        }

        let nextCameraIndex = 0;
        if (currentCamera) {
            const currentIndex = videoDevices.findIndex(device => device.deviceId === currentCamera);
            nextCameraIndex = (currentIndex + 1) % videoDevices.length;
        }

        const nextCamera = videoDevices[nextCameraIndex];
        log(`카메라 전환: ${nextCamera.label || `카메라 ${nextCameraIndex + 1}`}`);
        await startCamera(nextCamera.deviceId);
        
        // 선택된 카메라를 select에도 반영
        cameraSelect.value = nextCamera.deviceId;
    } catch (err) {
        console.error('카메라 전환 오류:', err);
        log(`카메라 전환 오류: ${err.message}`);
    }
}

// 스캔 시작/중지 토글
async function toggleScanning() {
    try {
        if (isScanning) {
            await codeReader.reset();
            isScanning = false;
            scanButton.textContent = '스캔 시작';
            log('스캔 중지');
        } else {
            scanButton.textContent = '스캔 중지';
            log('스캔 시작');
            startCamera();
        }
        updateDebugInfo();
    } catch (err) {
        console.error('스캔 토글 오류:', err);
        log(`토글 오류: ${err.message}`);
    }
}

// 이벤트 리스너 설정
scanButton.addEventListener('click', toggleScanning);
switchCameraButton.addEventListener('click', switchToNextCamera);
cameraSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        startCamera(e.target.value);
    }
});

// 페이지를 나갈 때 정리
window.addEventListener('beforeunload', () => {
    if (isScanning) {
        codeReader.reset();
        log('스캔 종료');
    }
});

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    try {
        scanButton.disabled = true;
        scanButton.textContent = '스캔 시작';
        log('바코드 스캐너 초기화');
        log(`브라우저: ${navigator.userAgent}`);
        startCamera();
        updateDebugInfo();
    } catch (err) {
        console.error('초기화 오류:', err);
        log(`초기화 오류: ${err.message}`);
    }
}); 