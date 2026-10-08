// ===================================================
// 바이브 카페 (Vibe Cafe) - 주문서 및 Supabase 연동 스크립트 (script.js)
// ===================================================

// [Supabase 설정] 사용자 설정 상수
// 실제 Supabase 프로젝트의 URL과 anon key를 아래 큰따옴표 안에 직접 넣어주세요.
const SUPABASE_URL = "https://kvnamgiwmonxixikvqhc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bmFtZ2l3bW9ueGl4aWt2cWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU3MTIsImV4cCI6MjEwNjk3MTcxMn0.nUUnkipOFEC_oSMYRERWTDRBh1zA1tADaooDdmFEzfM";

// [Supabase 클라이언트 생성]
// index.html에서 불러온 supabase-js 라이브러리를 사용해 클라이언트를 초기화합니다.
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// 문서의 HTML 요소들을 완전히 불러온 뒤 스크립트를 실행합니다.
document.addEventListener('DOMContentLoaded', function () {

  // --------------------------------------------------
  // 1. 주문 내역 상태(데이터) 변수
  // --------------------------------------------------
  // 접수된 주문 객체들을 저장할 배열
  let orders = [];
  // 주문 번호 카운터 (#1부터 순차 증가)
  let orderNumberCounter = 1;


  // --------------------------------------------------
  // 2. DOM(HTML) 요소 가져오기
  // --------------------------------------------------
  // 탭 네비게이션 및 화면 패널
  const tabOrder = document.getElementById('tab-order');
  const tabHistory = document.getElementById('tab-history');
  const orderPanel = document.getElementById('order-panel');
  const historyPanel = document.getElementById('history-panel');
  const orderCountBadge = document.getElementById('order-count-badge');

  // 주문 폼 요소
  const orderForm = document.getElementById('order-form');
  const customerNameInput = document.getElementById('customer-name');
  const customerPhoneInput = document.getElementById('customer-phone');
  const beverageSelect = document.getElementById('beverage');
  const sizeRadios = document.querySelectorAll('input[name="size"]');
  const optionCheckboxes = document.querySelectorAll('input[name="options"]');
  const quantityInput = document.getElementById('quantity');
  const requestsTextarea = document.getElementById('requests');
  const submitBtn = document.getElementById('submit-btn');

  // 예상 금액 및 주문 확인 메시지 요소
  const totalPriceSpan = document.getElementById('total-price');
  const orderConfirmation = document.getElementById('order-confirmation');

  // 주문 내역 화면 요소
  const orderListContainer = document.getElementById('order-list');
  const historySummaryArea = document.getElementById('history-summary-area');
  const historyTotalPriceElem = document.getElementById('history-total-price');
  const clearHistoryBtn = document.getElementById('clear-history-btn');


  // --------------------------------------------------
  // 3. 탭 전환 기능
  // --------------------------------------------------
  // "☕ 주문하기" 탭 클릭 시
  tabOrder.addEventListener('click', function () {
    tabOrder.classList.add('active');
    tabHistory.classList.remove('active');
    orderPanel.classList.remove('hidden');
    historyPanel.classList.add('hidden');
  });

  // "📋 주문 내역" 탭 클릭 시
  tabHistory.addEventListener('click', function () {
    tabHistory.classList.add('active');
    tabOrder.classList.remove('active');
    historyPanel.classList.remove('hidden');
    orderPanel.classList.add('hidden');
    renderOrders(); // 주문 내역 탭으로 이동할 때 최신 주문 목록을 다시 렌더링
  });


  // --------------------------------------------------
  // 4. 예상 금액 계산 함수 (calculateTotal)
  // --------------------------------------------------
  /**
   * 선택된 음료, 사이즈, 옵션, 수량을 바탕으로 총 금액을 계산하고 화면에 표시하는 함수입니다.
   * @returns {number} 계산된 총 금액
   */
  function calculateTotal() {
    // 1) 음료 선택 확인
    const selectedBeverageOption = beverageSelect.options[beverageSelect.selectedIndex];
    
    // 음료를 아직 선택하지 않은 경우 (value가 빈 문자열)
    if (!beverageSelect.value) {
      totalPriceSpan.textContent = '0';
      return 0;
    }

    // 음료 기본 가격 읽기 (data-price)
    const beveragePrice = Number(selectedBeverageOption.dataset.price) || 0;

    // 2) 사이즈 추가금 읽기 (data-price)
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSizeRadio ? (Number(selectedSizeRadio.dataset.price) || 0) : 0;

    // 3) 추가 옵션 금액 합산 (data-price)
    let optionsPrice = 0;
    optionCheckboxes.forEach(function (checkbox) {
      if (checkbox.checked) {
        optionsPrice += Number(checkbox.dataset.price) || 0;
      }
    });

    // 4) 수량 가져오기 (최소 1, 숫자가 아니면 1)
    const quantity = Math.max(1, Number(quantityInput.value) || 1);

    // 5) 총 금액 계산: (음료 기본가 + 사이즈 추가금 + 옵션 합계) * 수량
    const total = (beveragePrice + sizePrice + optionsPrice) * quantity;

    // 6) 화면의 예상 금액 표시 영역 업데이트 (천 단위 콤마)
    totalPriceSpan.textContent = total.toLocaleString('ko-KR');

    return total;
  }


  // --------------------------------------------------
  // 5. 실시간 금액 변경 이벤트 연결
  // --------------------------------------------------
  beverageSelect.addEventListener('change', calculateTotal);

  sizeRadios.forEach(function (radio) {
    radio.addEventListener('change', calculateTotal);
  });

  optionCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', calculateTotal);
  });

  quantityInput.addEventListener('input', calculateTotal);
  quantityInput.addEventListener('change', calculateTotal);


  // --------------------------------------------------
  // 6. 주문 내역 화면 렌더링 함수 (renderOrders)
  // --------------------------------------------------
  /**
   * orders 배열 데이터를 기반으로 주문 목록 화면과 총 주문 금액 요약을 다시 그립니다.
   * 보안(XSS 방지)을 위해 고객 입력 텍스트는 textContent로 안전하게 삽입합니다.
   */
  function renderOrders() {
    // (1) 탭 옆의 주문 건수 배지 숫자 갱신
    if (orderCountBadge) {
      orderCountBadge.textContent = orders.length;
    }

    // (2) 기존 화면 목록 비우기
    orderListContainer.textContent = '';

    // (3) 주문 내역이 하나도 없는 경우
    if (orders.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-orders';
      emptyDiv.textContent = '아직 주문 내역이 없어요 ☕';
      orderListContainer.appendChild(emptyDiv);

      // 하단 요약 및 삭제 버튼 영역 숨김
      historySummaryArea.classList.add('hidden');
      return;
    }

    // (4) 주문 내역이 있는 경우 하단 요약 영역 표시
    historySummaryArea.classList.remove('hidden');

    // (5) 전체 주문 금액 합산 및 표시
    const totalOrdersPrice = orders.reduce(function (sum, item) {
      return sum + item.totalPrice;
    }, 0);
    historyTotalPriceElem.textContent = `총 주문 금액: ${totalOrdersPrice.toLocaleString('ko-KR')}원 (${orders.length}건)`;

    // (6) orders 배열을 순회하며 베이지색 주문 카드 생성
    orders.forEach(function (order) {
      const card = document.createElement('div');
      card.className = 'order-card';

      // --- 1줄: 상단 헤더 (#1 이름님 · 금액 + 취소 버튼) ---
      const headerDiv = document.createElement('div');
      headerDiv.className = 'order-card-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'order-card-title';
      titleSpan.textContent = `#${order.id} ${order.name}님 · ${order.totalPrice.toLocaleString('ko-KR')}원`;

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'order-cancel-btn';
      cancelBtn.textContent = '취소';
      cancelBtn.addEventListener('click', function () {
        const isConfirmed = confirm(`주문 #${order.id}을(를) 취소하시겠습니까?`);
        if (isConfirmed) {
          orders = orders.filter(function (item) {
            return item.id !== order.id;
          });
          renderOrders();
        }
      });

      headerDiv.appendChild(titleSpan);
      headerDiv.appendChild(cancelBtn);

      // --- 2줄: 음료, 사이즈, 옵션, 수량 정보 ---
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'order-card-details';
      const optionsText = order.options && order.options.length > 0 ? ` (${order.options.join(', ')})` : '';
      detailsDiv.textContent = `${order.beverage} ${order.size}${optionsText} ${order.quantity}잔`;

      // --- 3줄: 요청사항(있을 때만) · 주문 시간 ---
      const metaDiv = document.createElement('div');
      metaDiv.className = 'order-card-meta';
      if (order.requests) {
        metaDiv.textContent = `${order.requests} · ${order.orderTime}`;
      } else {
        metaDiv.textContent = order.orderTime;
      }

      card.appendChild(headerDiv);
      card.appendChild(detailsDiv);
      card.appendChild(metaDiv);

      orderListContainer.appendChild(card);
    });
  }


  // --------------------------------------------------
  // 7. 주문하기 버튼 클릭 처리 (Supabase yong_cafe 테이블 저장)
  // --------------------------------------------------
  orderForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 새로고침 방지

    // 1) 이름 유효성 검사
    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      customerNameInput.focus();
      return;
    }

    // 2) 음료 선택 유효성 검사
    if (!beverageSelect.value) {
      alert('음료를 선택해주세요');
      beverageSelect.focus();
      return;
    }

    // 3) 음료 이름 및 단가 추출 (예: "카페라떼 4,000원" -> "카페라떼", 4000)
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
    const beverageName = selectedOption.textContent.replace(/\s*[\d,]+원$/, '').trim();
    const beveragePrice = Number(selectedOption.dataset.price) || 0; // drink_price

    // 4) 사이즈 텍스트 추출 (예: "M사이즈")
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizeValue = selectedSizeRadio ? selectedSizeRadio.value.toUpperCase() : 'M';
    const sizeText = `${sizeValue}사이즈`;

    // 5) 선택된 추가 옵션 이름들 추출 (배열)
    const selectedOptionNames = [];
    optionCheckboxes.forEach(function (checkbox) {
      if (checkbox.checked) {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        if (label) {
          const cleanOptionName = label.textContent.replace(/\s*\+[\d,]+원$/, '').trim();
          selectedOptionNames.push(cleanOptionName);
        }
      }
    });

    // 화면 표시용 옵션 텍스트 (옵션이 있으면 "(샷 추가)", 없으면 "")
    let optionsText = '';
    if (selectedOptionNames.length > 0) {
      optionsText = ` (${selectedOptionNames.join(', ')})`;
    }

    // 6) 수량 및 총 금액 계산
    const quantity = Math.max(1, Number(quantityInput.value) || 1);
    const finalTotal = calculateTotal();
    const formattedTotal = finalTotal.toLocaleString('ko-KR');

    // 7) 전화번호 및 요청사항
    const customerPhone = customerPhoneInput.value.trim() || null;
    const customerRequest = requestsTextarea.value.trim() || null;

    // 8) 저장 중 주문하기 버튼 비활성화 (중복 제출 방지)
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '주문 처리 중...';

    try {
      // Supabase 클라이언트 확인
      if (!supabaseClient) {
        throw new Error('Supabase 클라이언트가 설정되지 않았습니다. SUPABASE_URL과 SUPABASE_KEY를 확인해주세요.');
      }

      // 9) Supabase yong_cafe 테이블에 주문 데이터 저장 (INSERT)
      const { data, error } = await supabaseClient
        .from('yong_cafe')
        .insert([
          {
            customer_name: customerName,
            phone: customerPhone,
            drink: beverageName,
            drink_price: beveragePrice,
            size: sizeText,
            options: selectedOptionNames, // 배열 형태로 저장
            quantity: quantity,
            request: customerRequest,
            total_price: finalTotal
          }
        ])
        .select();

      // 저장 도중 Supabase 에러가 발생한 경우
      if (error) {
        throw error;
      }

      // 10) 저장 성공 시 처리
      // (1) 현재 시간 생성 (예: "오전 11:15")
      const now = new Date();
      const orderTime = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // (2) 생성된 주문 객체를 로컬 orders 배열에 추가 (최신 주문이 맨 위로)
      const newOrder = {
        id: (data && data[0] && data[0].id) ? data[0].id : orderNumberCounter++,
        name: customerName,
        beverage: beverageName,
        size: sizeText,
        options: selectedOptionNames,
        quantity: quantity,
        requests: customerRequest || '',
        totalPrice: finalTotal,
        orderTime: orderTime
      };
      orders.unshift(newOrder);

      // (3) 주문 내역 화면 및 배지 갱신
      renderOrders();

      // (4) 기존 주문 확인 메시지 표시
      const confirmationMessage = `${customerName}님, ${beverageName} ${sizeText}${optionsText} ${quantity}잔, 총 ${formattedTotal}원 주문이 접수되었습니다!`;
      orderConfirmation.textContent = confirmationMessage;
      orderConfirmation.hidden = false;
      orderConfirmation.classList.remove('hidden');

      // (5) 확인 메시지로 부드럽게 스크롤
      orderConfirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
      // 11) 저장 실패 시 에러 처리
      console.error('주문 저장 에러:', error);
      alert('주문 저장에 실패했어요');
    } finally {
      // 12) 주문하기 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });


  // --------------------------------------------------
  // 8. 다시 작성 버튼 처리 (reset 이벤트)
  // --------------------------------------------------
  orderForm.addEventListener('reset', function () {
    setTimeout(function () {
      // M 사이즈 기본 복원
      const sizeMRadio = document.getElementById('size-m');
      if (sizeMRadio) {
        sizeMRadio.checked = true;
      }

      // 수량 1 복원
      quantityInput.value = '1';

      // 예상 금액 0원 복원
      calculateTotal();

      // 주문 확인 메시지 숨김
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
      orderConfirmation.classList.add('hidden');
    }, 0);
  });


  // --------------------------------------------------
  // 9. 내역 모두 지우기 버튼 이벤트
  // --------------------------------------------------
  clearHistoryBtn.addEventListener('click', function () {
    const isConfirmed = confirm('모든 주문 내역을 삭제하시겠습니까?');
    if (isConfirmed) {
      orders = [];
      renderOrders();
    }
  });


  // --------------------------------------------------
  // 10. 페이지 로드 초기 실행
  // --------------------------------------------------
  calculateTotal();
  renderOrders();
});
