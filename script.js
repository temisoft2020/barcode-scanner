const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const barcodeList = document.getElementById('barcodeList');
const scanButton = document.getElementById('scanButton');
const ctx = canvas.getContext('2d');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const codeReader = new ZXing.BrowserMultiFormatReader();

// 캔버스 크기 설정
function updateCanvasSize() {
    if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
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

// 카메라 시작
async function startCamera() {
    try {
        // 이전 스트림이 있다면 정리
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        // 모바일에서는 후면 카메라, 데스크톱에서는 기본 카메라 사용
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: isMobile ? 'environment' : 'user',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                autoFocus: true,
                focusMode: 'continuous'
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        // 자동 초점 설정 시도
        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack) {
            try {
                await videoTrack.applyConstraints({
                    advanced: [{
                        autoFocus: true
                    }]
                });
                console.log('자동 초점 설정 완료');
            } catch (focusErr) {
                console.log('자동 초점 설정 실패:', focusErr);
            }
        }

        // 비디오 이벤트 리스너 설정
        video.onloadedmetadata = () => {
            updateCanvasSize();
            video.play()
                .then(() => {
                    console.log('비디오 재생 시작');
                    scanButton.disabled = false;
                })
                .catch(error => {
                    console.error('비디오 재생 실패:', error);
                    scanButton.disabled = true;
                });
        };

    } catch (err) {
        console.error('카메라 접근 오류:', err);
        alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
        scanButton.disabled = true;
    }
}

// 바코드 스캔 실행
async function scanBarcode() {
    if (!video.srcObject) {
        alert('카메라가 활성화되지 않았습니다.');
        return;
    }

    try {
        // 스캔 버튼 비활성화
        scanButton.disabled = true;
        scanButton.textContent = '스캔 중...';

        // 바코드 스캔
        const result = await codeReader.decodeFromVideoElement(video);
        
        if (result && !scannedBarcodes.has(result.text)) {
            // 새로운 바코드인 경우에만 추가
            console.log('바코드 인식:', result.text);
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
        console.log('바코드를 찾을 수 없습니다.');
    } finally {
        // 스캔 버튼 다시 활성화
        scanButton.disabled = false;
        scanButton.textContent = '바코드 스캔';
    }
}

// 이벤트 리스너 설정
scanButton.addEventListener('click', scanBarcode);

// 페이지를 나갈 때 정리
window.addEventListener('beforeunload', () => {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
});

// 페이지 로드 시 카메라 시작
window.addEventListener('DOMContentLoaded', () => {
    scanButton.disabled = true;  // 초기에는 버튼 비활성화
    startCamera();
}); 