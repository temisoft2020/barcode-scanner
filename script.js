const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const barcodeList = document.getElementById('barcodeList');
const scanButton = document.getElementById('scanButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const cameraSelect = document.getElementById('cameraSelect');
const logArea = document.getElementById('logArea');
const debugInfo = document.getElementById('debugInfo');
const ctx = canvas.getContext('2d');

// 스캔된 바코드를 저장할 Set
const scannedBarcodes = new Set();

// ZXing 바코드 리더 초기화
const hints = new Map();
hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
hints.set(ZXing.DecodeHintType.ASSUME_GS1, false);
hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.ITF
]);
// 모든 방향 스캔 활성화
hints.set(ZXing.DecodeHintType.TRY_INVERT, true);
hints.set(ZXing.DecodeHintType.PURE_BARCODE, false);
hints.set(ZXing.DecodeHintType.CHARACTER_SET, "UTF-8");

const codeReader = new ZXing.BrowserMultiFormatReader(hints);
codeReader.timeBetweenDecodingAttempts = 200; // 스캔 간격 설정 (ms)
let isScanning = false;
let currentCamera = null;

// 알림음 생성
const beep = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");

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
        
        // 바코드 방향 계산
        const angle = Math.atan2(
            points[1].y - points[0].y,
            points[1].x - points[0].x
        ) * (180 / Math.PI);
        
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        // 회전된 사각형 그리기
        ctx.save();
        ctx.translate((minX + maxX) / 2, (minY + maxY) / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.strokeRect(
            -(maxX - minX) / 2,
            -(maxY - minY) / 2,
            maxX - minX,
            maxY - minY
        );
        ctx.restore();

        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 3000);
        
        // 방향 정보 로깅
        log(`바코드 방향: ${Math.round(angle)}도`);
    } catch (err) {
        console.error('바코드 박스 그리기 오류:', err);
        log(`그리기 오류: ${err.message}`);
    }
}

// 비디오 메타데이터 로드 시 캔버스 크기 설정
video.addEventListener('loadedmetadata', () => {
    updateCanvasSize();
});

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

// 바코드 인식 시 알림 함수
function notifyBarcodeDetected() {
    // 알림음 재생
    beep.play();
    
    // 진동 (지원되는 경우)
    if ('vibrate' in navigator) {
        navigator.vibrate(200); // 200ms 동안 진동
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

        // 먼저 카메라 권한 확인
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // 임시 스트림 중지
            log('카메라 권한 확인 완료');
        } catch (err) {
            log('카메라 권한 없음, 권한을 요청합니다.');
            throw new Error('카메라 권한이 필요합니다.');
        }

        const videoDevices = await updateCameraList();
        
        log('=== 사용 가능한 카메라 목록 ===');
        videoDevices.forEach((device, index) => {
            log(`카메라 ${index + 1}: ${device.label || '이름 없음'} (${device.deviceId})`);
        });
        log('==========================');

        if (videoDevices.length === 0) {
            throw new Error('사용 가능한 카메라가 없습니다.');
        }

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
            video: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: isMobile ? 'environment' : 'user',
                focusMode: 'continuous', // 연속 자동 초점
                autoFocus: true, // 자동 초점 활성화
                advanced: [{
                    focusMode: 'continuous',
                    autoFocus: true
                }]
            }
        };

        // deviceId가 지정된 경우 해당 카메라 사용
        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
            currentCamera = deviceId;
            log(`지정된 카메라 사용: ${deviceId}`);
        } else if (isMobile && videoDevices.length > 0) {
            // 모바일에서는 마지막 카메라를 기본값으로 사용
            const lastCamera = videoDevices[videoDevices.length - 1];
            constraints.video.deviceId = { exact: lastCamera.deviceId };
            currentCamera = lastCamera.deviceId;
            log(`모바일 기본 카메라(마지막) 선택: ${lastCamera.label || '이름 없음'}`);
            
            // 선택된 카메라를 select에도 반영
            cameraSelect.value = lastCamera.deviceId;
        }

        log('카메라 초기화 중...');
        log(`디바이스 정보: ${isMobile ? '모바일' : '데스크톱'}`);
        log(`비디오 제약 조건: ${JSON.stringify(constraints.video)}`);

        // 먼저 비디오 스트림 시작
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // 자동 초점 기능 설정
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                const capabilities = videoTrack.getCapabilities();
                if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                    await videoTrack.applyConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    });
                    log('자동 초점 설정 완료');
                } else {
                    log('자동 초점 기능이 지원되지 않습니다');
                }
            }
            
            await video.play();
            log('비디오 스트림 시작 성공');
        } catch (err) {
            log(`비디오 스트림 시작 실패: ${err.message}`);
            throw err;
        }

        // ZXing 디코더 시작
        await codeReader.decodeFromConstraints(
            constraints,
            video,
            async (result, error) => {
                if (result && !scannedBarcodes.has(result.text)) {
                    log(`새로운 바코드 인식: ${result.text} (방향: ${result.orientation}도)`);
                    scannedBarcodes.add(result.text);
                    
                    // 바코드 인식 시 알림
                    notifyBarcodeDetected();
                    
                    let imageUrl = null;
                    if (result.resultPoints) {
                        drawBarcodeBox(result);
                        imageUrl = await captureBarcode(result);
                        log(imageUrl ? '이미지 캡처 성공' : '이미지 캡처 실패');
                    }
                    
                    const li = document.createElement('li');
                    li.className = 'barcode-item';
                    
                    if (imageUrl) {
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.className = 'barcode-image';
                        img.alt = '바코드 이미지';
                        img.onerror = () => {
                            log('이미지 로드 실패');
                            img.style.display = 'none';
                        };
                        img.onload = () => {
                            log('이미지 로드 성공');
                        };
                        li.appendChild(img);
                    }
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'barcode-text';
                    textDiv.textContent = result.text;
                    li.appendChild(textDiv);
                    
                    barcodeList.insertBefore(li, barcodeList.firstChild);
                    updateDebugInfo();
                } else if (error && error.message !== 'No MultiFormat Readers were able to detect the code.') {
                    log(`스캔 오류: ${error.message}`);
                }
            }
        );

        isScanning = true;
        scanButton.disabled = false;
        scanButton.textContent = '스캔 중지';
        log('카메라 스캔 시작');
        updateDebugInfo();

    } catch (err) {
        console.error('카메라 접근 오류:', err);
        log(`카메라 오류: ${err.message}`);
        alert(`카메라 접근에 실패했습니다: ${err.message}`);
        scanButton.disabled = true;
        updateDebugInfo();
        throw err;
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
        log(`스캔 토글 오류: ${err.message}`);
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
window.addEventListener('DOMContentLoaded', async () => {
    try {
        scanButton.disabled = true;
        scanButton.textContent = '스캔 시작';
        log('바코드 스캐너 초기화');
        log(`브라우저: ${navigator.userAgent}`);
        
        try {
            await startCamera();
        } catch (err) {
            log(`카메라 초기화 실패: ${err.message}`);
            alert(`카메라를 시작할 수 없습니다: ${err.message}\n카메라 권한을 확인해주세요.`);
        }
    } catch (err) {
        console.error('초기화 오류:', err);
        log(`초기화 오류: ${err.message}`);
    }
});