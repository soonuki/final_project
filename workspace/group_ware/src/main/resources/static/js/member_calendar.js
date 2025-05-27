document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    // CSRF 토큰 추출
    const csrfToken = document.querySelector('meta[name="_csrf"]').getAttribute('content');
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]').getAttribute('content');
    
    // URL에서 memberNo 추출
    const pathArray = window.location.pathname.split('/');
    const memberNo = pathArray[pathArray.length - 1]; // 마지막 부분이 memberNo

    // SSE 연결 설정
    const eventSource = new EventSource('/notification/sse');
    eventSource.addEventListener('schedule-notification', function (event) {
        const data = event.data;
        Swal.fire({
            title: '알림',
            text: data,
            icon: 'info',
            confirmButtonText: '확인'
        });
    });

    eventSource.onerror = function () {
        console.error('SSE 연결 오류');
    };

    // 일정 데이터 매핑 함수
    const mapScheduleData = (item) => ({
        id: item.schedule_no,
        title: item.schedule_title,
        start: item.start_date + 'T' + item.start_time,
        end: item.end_date + 'T' + item.end_time,
        backgroundColor: convertColorValue(item.schedule_background_color),
        extendedProps: {
            schedule_content: item.schedule_content,
            schedule_background_color: item.schedule_background_color,
            notification_minutes: parseInt(item.notification_minutes, 10) || 0,
            is_notice: item.is_notice // 여기서 _notice를 is_notice로 변경
        }
    });

    // 배경색 값 변환 함수
    const colorMapping = {
        "1": "#FF5722",
        "2": "#FF9800",
        "3": "#9C27B0",
        "4": "#E91E63"
    };

    const convertColorValue = (value) => colorMapping[value] || value;

    // FullCalendar 초기화
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialDate: new Date(),
        fixedWeekCount: false,
        initialView: 'dayGridMonth',
        locale: 'ko',
        timeZone: 'Asia/Seoul',
      
        headerToolbar: {
            left: 'today,prev,next',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
       
        buttonText: {
            today: '오늘',
            month: '월간',
            week: '주간',
            day: '일간',
            list: '목록'
        },
        editable: true,
        droppable: true,
      events: function(fetchInfo, successCallback, failureCallback) {

          fetch(`/api/calendar/member/${memberNo}`, { // 수정된 부분
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json'
              }
          })
          .then(response => {
              // 응답이 성공적인지 확인
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
              return response.json();
          })
          .then(data => {
              console.log('Fetched member events data:', data); // 데이터 확인

              // data가 배열인지 확인
              if (!Array.isArray(data)) {
                  throw new Error('Data is not an array');
              }

              const events = data.map(event => ({
                  id: event.schedule_no,
                  title: event.schedule_title,
                  start: event.start_date + 'T' + event.start_time,
                  end: event.end_date + 'T' + event.end_time,
                  backgroundColor: event.schedule_background_color,
                  extendedProps: {
                      schedule_content: event.schedule_content,
                      notification_minutes: parseInt(event.notification_minutes, 10) || 0,
                      is_notice: event.is_notice
                  }
              }));

              successCallback(events);
          })
          .catch(error => {
              console.error('Error fetching member events:', error);
              failureCallback(error);
          });
      },


        eventClick: function (info) {
            const event = info.event;
            console.log('is_notice:', event.extendedProps.is_notice); // 로그로 확인

            // 공지사항 클릭 시 리다이렉트
            if (event.extendedProps.is_notice === true) {
                const noticeNo = event.id; // 공지사항 번호 가져오기
                window.location.href = `/notice/${noticeNo}`; // 변경된 경로로 이동
            } else {
                // 개인 일정 클릭 시 처리 로직
                document.getElementById('detail_title').value = event.title;
                document.getElementById('detail_start_date').value = event.start.toISOString().split('T')[0];
                document.getElementById('detail_start_time').value = event.start.toISOString().split('T')[1].substring(0, 5);
                document.getElementById('detail_end_date').value = event.end ? event.end.toISOString().split('T')[0] : event.start.toISOString().split('T')[0];
                document.getElementById('detail_end_time').value = event.end ? event.end.toISOString().split('T')[1].substring(0, 5) : event.start.toISOString().split('T')[1].substring(0, 5);
                document.getElementById('detail_content').value = event.extendedProps.schedule_content || '';
                document.getElementById('detail_notification_minutes').value = event.extendedProps.notification_minutes !== undefined ? event.extendedProps.notification_minutes : '';

            // 배경색 설정
            const color = event.extendedProps.schedule_background_color;
            if (color) {
                const colorInput = document.querySelector(`input[name="detail_background_color"][value="${color}"]`);
                if (colorInput) {
                    // 해당 배경색의 input 요소가 있는 경우, 선택된 상태로 설정
                    colorInput.checked = true;

                    // 모달의 배경 색상 미리보기 업데이트 (예시로 스타일을 바꿔주기 위해 추가)
                    const detailBackgroundDisplay = document.querySelector('.detail_background_display');
                    if (detailBackgroundDisplay) {
                        detailBackgroundDisplay.style.backgroundColor = color; // 배경색 미리보기 업데이트
                    } else {
                        console.warn('detail_background_display 요소가 존재하지 않습니다.');
                    }
                } else {
                    console.warn('배경색 input 요소를 찾을 수 없습니다:', color);
                }
            }
                document.getElementById('detailModal').style.display = 'block';
            // 수정 버튼 클릭 처리 (모달이 열릴 때마다 이벤트 설정)
            document.querySelector('.update-button').onclick = function () {
                // 유효성 검사
                const title = document.getElementById('detail_title').value;
                const startDate = document.getElementById('detail_start_date').value;
                const startTime = document.getElementById('detail_start_time').value;
                const endDate = document.getElementById('detail_end_date').value;
                const endTime = document.getElementById('detail_end_time').value;
                const selectedBackgroundColorElement = document.querySelector('input[name="detail_background_color"]:checked');

                if (!title) {
                    Swal.fire("오류", "제목을 입력해야 합니다.", "warning");
                    return;
                }

                if (new Date(`${startDate}T${startTime}`) > new Date(`${endDate}T${endTime}`)) {
                    Swal.fire("오류", "시작 시간이 종료 시간보다 늦을 수 없습니다.", "warning");
                    return;
                }

                if (!selectedBackgroundColorElement) {
                    Swal.fire("오류", "배경색을 선택해야 합니다.", "warning");
                    return;
                }

                const updatedData = {
                    schedule_no: event.id,
                    schedule_title: title,
                    start_date: startDate,
                    start_time: startTime,
                    end_date: endDate,
                    end_time: endTime,
                    notification_minutes: parseInt(document.getElementById('detail_notification_minutes').value, 10),
                    schedule_content: document.getElementById('detail_content').value,
                    schedule_background_color: selectedBackgroundColorElement.value
                };

                fetch(`/calendar/schedule/update/${event.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [csrfHeader]: csrfToken
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.res_code === "200") {
                        // 이벤트 업데이트
                        event.setProp('title', updatedData.schedule_title);
                        event.setStart(`${updatedData.start_date}T${updatedData.start_time}`);
                        event.setEnd(`${updatedData.end_date}T${updatedData.end_time}`);
                        event.setExtendedProp('schedule_content', updatedData.schedule_content);
                        event.setExtendedProp('notification_minutes', updatedData.notification_minutes);
                        event.setProp('backgroundColor', convertColorValue(updatedData.schedule_background_color)); // 배경색 수정 반영

                        document.getElementById('detailModal').style.display = 'none';
                    } else {
                        Swal.fire("오류", "수정 중 오류가 발생했습니다.", "error");
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire("오류", "수정 중 오류가 발생했습니다.", "error");
                });
            };

                // 삭제 버튼 클릭 처리 (모달이 열릴 때마다 이벤트 설정)
                document.querySelector('.delete-button').onclick = function () {
                    Swal.fire({
                        title: '정말 삭제하시겠습니까?',
                        text: "이 작업은 되돌릴 수 없습니다!",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: '네, 삭제합니다.',
                        cancelButtonText: '아니요, 취소합니다.'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            fetch(`/calendar/schedule/delete/${event.id}`, {
                                method: 'DELETE',
                                headers: {
                                    [csrfHeader]: csrfToken
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.res_code === "200") {
                                    event.remove();
                                    document.getElementById('detailModal').style.display = 'none';
                                    Swal.fire("삭제 완료", "일정이 삭제되었습니다.", "success");
                                } else {
                                    Swal.fire("오류", "삭제 중 오류가 발생했습니다.", "error");
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);
                                Swal.fire("오류", "삭제 중 오류가 발생했습니다.", "error");
                            });
                        }
                    });
                };
            }
        }
    });

    // 일정 목록 불러오기
    fetch(`/api/calendar/member/${memberNo}/events`) // 특정 멤버의 일정 데이터를 가져오기
        .then(response => response.json())
        .then(data => {
            const events = data.map(mapScheduleData);
            calendar.addEventSource(events); // 이벤트 소스에 추가
            events.forEach(event => {
                setEventNotification(event);
            });
        })
        .catch(error => console.error('Error fetching events:', error));

    // 캘린더 렌더링
    calendar.render();

    // 'X' 닫기 버튼 처리
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', function () {
            document.getElementById('myModal').style.display = 'none';
            document.getElementById('detailModal').style.display = 'none';
        });
    });

    // 취소 버튼 처리
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('cancel-button')) {
            document.getElementById('myModal').style.display = 'none';
            document.getElementById('detailModal').style.display = 'none';
        }
    });

    // 일정 등록 처리
    document.getElementById("scheduleForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(document.getElementById("scheduleForm"));
        const formObject = {};

        formData.forEach((value, key) => {
            formObject[key] = value;
        });

        formObject.schedule_background_color = document.querySelector('input[name="background_color"]:checked').value;
        formObject.schedule_content = document.getElementById("schedule_content").value;
        formObject.notification_minutes = parseInt(document.getElementById('notification_minutes').value, 10) || 0;

        fetch('/calendar/schedule/createScheduleWithJson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [csrfHeader]: csrfToken
            },
            body: JSON.stringify(formObject)
        })
        .then(response => response.json())
        .then(data => {
            if (data.res_code === "200") {
                const newEvent = mapScheduleData({
                    schedule_no: data.schedule_no,
                    ...formObject
                });

                calendar.addEvent(newEvent);
                document.getElementById('myModal').style.display = 'none';
                document.getElementById('scheduleForm').reset();

                setEventNotification(newEvent);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // 알림 설정 함수 추가
    const setEventNotification = (event) => {
        const notificationMinutes = event.extendedProps.notification_minutes;

        if (notificationMinutes && notificationMinutes > 0) {
            const startDateTime = new Date(event.start);
            const alertTime = new Date(startDateTime.getTime() - notificationMinutes * 60000);
            const currentTime = new Date();
            
            const remainingMinutes = Math.floor((alertTime - currentTime) / 60000);

            if (remainingMinutes > 0) {
                setTimeout(() => {
                    Swal.fire({
                        title: '알림',
                        text: `일정 "${event.title}"이(가) ${notificationMinutes}분 후에 시작됩니다.`,
                        icon: 'info',
                        confirmButtonText: '확인'
                    });
                }, remainingMinutes * 60000);
            }
        }
    };

    // 날짜 및 시간 선택기 초기화
    $(document).ready(function () {
        flatpickr(".datetimepicker", {
            dateFormat: "Y-m-d",
            enableTime: false
        });

        $('.timepicker').on('input', function () {
            let timeInputValue = $(this).val().replace(/[^0-9]/g, '');
            if (timeInputValue.length >= 3) {
                timeInputValue = timeInputValue.slice(0, 2) + ':' + timeInputValue.slice(2);
            } else if (timeInputValue.length >= 2) {
                timeInputValue = timeInputValue.slice(0, 2) + ':';
            }
            $(this).val(timeInputValue);

            const validTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

            if (validTimePattern.test(timeInputValue)) {
                const timeString = moment(timeInputValue, 'HH:mm').format('HH:mm');
                const timeList = $(this).next('.time-select-list');
                timeList.empty().show();

                let startTime = moment(timeString, 'HH:mm');
                for (let i = 0; i < 8; i++) {
                    const nextTime = startTime.add(30, 'minutes').format('HH:mm');
                    const listItem = $('<li>')
                        .text(nextTime)
                        .css({
                            "border": "1px solid #ccc",
                            "background": "#fff",
                            "padding": "5px",
                            "margin": "2px",
                            "cursor": "pointer",
                            "display": "block"
                        })
                        .on('click', function () {
                            $(this).closest('.input-group').find('.timepicker').val(nextTime);
                            timeList.hide();
                        });
                    timeList.append(listItem);
                }
            }
        });

        $('.timepicker').on('blur', function () {
            const list = $(this).next('.time-select-list');
            setTimeout(() => list.hide(), 200);
        });
    });
});
