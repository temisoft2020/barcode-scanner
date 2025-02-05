const video = document.getElementById('video');
const barcodeList = document.getElementById('barcodeList');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const codeReader = new ZXing.BrowserMultiFormatReader();

// 카메라 시작
async function startCamera() {
    try {
        const constraints = {
            video: { facingMode: 'environment' }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        startScanning();
    } catch (err) {
        console.error('카메라 접근 오류:', err);
        alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
    }
}

// 바코드 스캔 시작
function startScanning() {
    setInterval(async () => {
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
            }
        } catch (err) {
            // 바코드를 찾지 못한 경우 무시
        }
    }, 200); // 0.2초마다 스캔
}

// 페이지 로드 시 카메라 시작
window.addEventListener('load', startCamera); 