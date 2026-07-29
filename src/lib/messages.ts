// Từ điển 2 ngôn ngữ: vi (mặc định) / en.
// Placeholder dạng {name} được thay bằng t(key, { name: ... }).
export type Locale = "vi" | "en";

type Entry = Record<Locale, string>;

export const MESSAGES = {
  // ---- Nav / chung ----
  "nav.tagline": { vi: "Trade thẻ TCG phí 0%", en: "Zero-fee TCG trading" },
  "nav.browse": { vi: "Tìm kiếm", en: "Browse" },
  "nav.sell": { vi: "Đăng bán", en: "Sell" },
  "nav.chat": { vi: "Chat", en: "Chat" },
  "nav.login": { vi: "Đăng nhập", en: "Log in" },
  "nav.register": { vi: "Đăng ký", en: "Sign up" },
  "nav.logout": { vi: "Đăng xuất", en: "Log out" },
  "nav.unreadAria": { vi: "{n} tin nhắn chưa đọc", en: "{n} unread messages" },
  "nav.activityAria": { vi: "{n} thông báo mới", en: "{n} new notifications" },
  "nav.menu": { vi: "Menu", en: "Menu" },
  "common.loading": { vi: "Đang tải…", en: "Loading…" },
  "common.loadError": { vi: "Tải dữ liệu thất bại.", en: "Failed to load." },
  "common.error": { vi: "Đã xảy ra lỗi.", en: "Something went wrong." },
  "common.negotiable": { vi: "Thương lượng", en: "Negotiable" },
  "common.back": { vi: "Quay lại", en: "Back" },
  "common.save": { vi: "Lưu", en: "Save" },
  "common.cancel": { vi: "Hủy", en: "Cancel" },
  "footer.tagline": {
    vi: "DEAL — Nền tảng trade thẻ TCG P2P, phí 0% (MVP)",
    en: "DEAL — Zero-fee P2P TCG trading platform (MVP)",
  },
  "legal.terms": { vi: "Điều khoản sử dụng", en: "Terms of Service" },
  "legal.privacy": { vi: "Chính sách bảo mật", en: "Privacy Policy" },

  // ---- Game / loại / condition / trạng thái ----
  "game.pokemon": { vi: "Thẻ Pokémon", en: "Pokémon TCG" },
  "game.onepiece": { vi: "Thẻ One Piece", en: "One Piece TCG" },
  "game.other": { vi: "Sản phẩm khác", en: "Other" },
  "cat.single": { vi: "Thẻ lẻ", en: "Single card" },
  "cat.box": { vi: "BOX (chưa khui)", en: "Sealed box" },
  "cond.PSA10": { vi: "PSA10", en: "PSA 10" },
  "cond.PSA9": { vi: "PSA9", en: "PSA 9" },
  "cond.BGS95": { vi: "BGS9.5", en: "BGS 9.5" },
  "cond.RAW_NM": { vi: "Thẻ trần - đẹp (NM)", en: "Raw - Near Mint" },
  "cond.RAW_LP": { vi: "Thẻ trần - xước nhẹ (LP)", en: "Raw - Lightly Played" },
  "cond.RAW_MP": { vi: "Thẻ trần - có xước (MP)", en: "Raw - Moderately Played" },
  "cond.RAW_HP": { vi: "Thẻ trần - xước nặng (HP)", en: "Raw - Heavily Played" },
  "cond.DAMAGED": { vi: "Hư hại", en: "Damaged" },
  "cond.BOX_SHRINK": { vi: "Nguyên seal (shrink)", en: "Sealed with shrink" },
  "cond.BOX_NO_SHRINK": { vi: "Chưa khui, mất shrink", en: "Sealed, no shrink" },
  "lstatus.active": { vi: "Đang bán", en: "Active" },
  "lstatus.in_trade": { vi: "Đang giao dịch", en: "In trade" },
  "lstatus.closed": { vi: "Đã bán", en: "Sold" },
  "lstatus.cancelled": { vi: "Đã hủy", en: "Cancelled" },
  "tstatus.pending": { vi: "Chờ đối phương xác nhận", en: "Awaiting confirmation" },
  "tstatus.confirmed": { vi: "Hoàn tất (2 bên xác nhận)", en: "Completed (both confirmed)" },
  "tstatus.self_reported": { vi: "Hoàn tất (tự khai)", en: "Completed (self-reported)" },
  "tstatus.cancelled": { vi: "Đã hủy", en: "Cancelled" },
  "ttype.sell": { vi: "Bán", en: "Sale" },
  "ttype.trade": { vi: "Trao đổi", en: "Trade" },
  "rel.confirmed": { vi: "2 bên xác nhận", en: "Both confirmed" },
  "rel.self_reported": { vi: "Tự khai", en: "Self-reported" },

  // ---- Trang chủ ----
  "home.heroTitle": {
    vi: "Trade thẻ trực tiếp, hoàn toàn miễn phí.",
    en: "Trade cards directly, with zero fees.",
  },
  "home.heroDesc": {
    vi: "Hoàn tất giao dịch để đóng góp dữ liệu và mở khóa giá bán thực tế của cộng đồng. Đăng bán và mua đều không mất phí.",
    en: "Complete trades to contribute data and unlock real community sale prices. Listing and buying are completely free.",
  },
  "home.tabAll": { vi: "Tất cả", en: "All" },
  "home.tabPokemon": { vi: "Pokémon", en: "Pokémon" },
  "home.tabOnepiece": { vi: "One Piece", en: "One Piece" },
  "home.tabOther": { vi: "Khác", en: "Other" },
  "home.tabSingle": { vi: "Thẻ lẻ", en: "Singles" },
  "home.tabBox": { vi: "BOX", en: "Boxes" },
  "home.count": { vi: "{n} tin đăng", en: "{n} listings" },
  // Kéo xuống để tải lại — chỉ hiện trong PWA đã cài (không có thanh địa chỉ).
  "ptr.pull": { vi: "Kéo xuống để tải lại", en: "Pull down to refresh" },
  "ptr.release": { vi: "Thả ra để tải lại", en: "Release to refresh" },
  "ptr.refreshing": { vi: "Đang tải lại…", en: "Refreshing…" },
  // Lọc theo LOẠI tin: trang tìm kiếm giờ gộp cả tin bán lẫn tin đăng mua.
  "home.tabTypeSell": { vi: "Đang bán", en: "For sale" },
  "home.tabTypeBuy": { vi: "Đăng mua", en: "Wanted" },
  "home.badgeBuy": { vi: "Đăng mua", en: "Wanted" },
  "home.emptyBuy": {
    vi: "Chưa có tin đăng mua nào.",
    en: "No buy requests yet.",
  },
  "home.searchPlaceholder": {
    vi: "Tìm theo tên thẻ, set, số thẻ hoặc tên ga",
    en: "Search by card name, set, number or station",
  },
  "home.searchClear": { vi: "Xóa tìm kiếm", en: "Clear search" },
  "home.empty": {
    vi: "Chưa có tin đăng nào. Hãy là người đăng bán đầu tiên!",
    en: "No listings yet. Be the first to sell!",
  },
  "home.emptySearch": {
    vi: "Không tìm thấy tin đăng nào khớp với “{q}”.",
    en: "No listings match “{q}”.",
  },

  // ---- Auth ----
  "auth.loginTitle": { vi: "Đăng nhập", en: "Log in" },
  "auth.registerTitle": { vi: "Đăng ký (miễn phí)", en: "Sign up (free)" },
  "auth.displayName": { vi: "Tên hiển thị", en: "Display name" },
  "auth.email": { vi: "Địa chỉ email", en: "Email address" },
  "auth.password": { vi: "Mật khẩu", en: "Password" },
  "auth.passwordHint": { vi: "Mật khẩu (từ 8 ký tự)", en: "Password (8+ characters)" },
  "auth.forgot": { vi: "Quên mật khẩu?", en: "Forgot password?" },
  "auth.submitLogin": { vi: "Đăng nhập", en: "Log in" },
  "auth.submitRegister": { vi: "Đăng ký", en: "Sign up" },
  "auth.sending": { vi: "Đang gửi…", en: "Sending…" },
  "auth.agreePrefix": { vi: "Tôi đồng ý với ", en: "I agree to the " },
  "auth.agreeMid": { vi: " và ", en: " and " },
  "auth.agreeSuffix": { vi: "", en: "" },
  "auth.noAccount": { vi: "Chưa có tài khoản?", en: "Don't have an account?" },
  "auth.haveAccount": { vi: "Đã có tài khoản?", en: "Already have an account?" },

  // ---- Đăng tin ----
  "sell.loginPrompt": { vi: "Cần đăng nhập để đăng bán.", en: "Log in to create a listing." },
  "sell.title": { vi: "Đăng bán thẻ", en: "Create a listing" },
  "sell.game": { vi: "Game", en: "Game" },
  "sell.category": { vi: "Loại sản phẩm", en: "Product type" },
  "sell.selectCard": { vi: "Thẻ (tìm trong danh mục hoặc thêm mới)", en: "Card (search catalog or add new)" },
  "sell.selectBox": { vi: "BOX (tìm trong danh mục hoặc thêm mới)", en: "Box (search catalog or add new)" },
  "sell.selectOther": {
    vi: "Tên sản phẩm (tìm hoặc tạo mới)",
    en: "Product name (search or create new)",
  },
  "sell.searchOther": {
    vi: "Nhập tên sản phẩm (VD: playmat, thẻ Yu-Gi-Oh!…)",
    en: "Type a product name (e.g. playmat, Yu-Gi-Oh! card…)",
  },
  "sell.createOther": {
    vi: "Tạo sản phẩm mới: “{name}”",
    en: "Create new product “{name}”",
  },
  "sell.createFail": {
    vi: "Tạo sản phẩm thất bại. Vui lòng thử lại sau.",
    en: "Failed to create the product. Please try again later.",
  },
  "sell.condition": { vi: "Tình trạng (bắt buộc)", en: "Condition (required)" },
  "sell.photo": { vi: "Ảnh thật (bắt buộc, tối đa 5MB)", en: "Photo of actual item (required, max 5MB)" },
  "sell.photoPreviewAlt": { vi: "Xem trước ảnh tải lên", en: "Upload preview" },
  "sell.tradeType": { vi: "Hình thức", en: "Listing type" },
  "sell.price": { vi: "Giá mong muốn (¥, không bắt buộc)", en: "Asking price (JPY, optional)" },
  "sell.priceExample": { vi: "VD: 50000", en: "e.g. 50000" },
  "sell.quantity": { vi: "Số lượng", en: "Quantity" },
  "sell.station": {
    vi: "Ga gần nhất (để hẹn giao trực tiếp, không bắt buộc)",
    en: "Nearest station (for in-person handoff, optional)",
  },
  "sell.stationPlaceholder": {
    vi: "VD: Shinjuku, Umeda, Osaka…",
    en: "e.g. Shinjuku Sta., Umeda Sta.",
  },
  "detail.station": { vi: "Ga gần nhất", en: "Nearest station" },
  "sell.note": { vi: "Mô tả (không bắt buộc, tối đa 500 ký tự)", en: "Description (optional, max 500 chars)" },
  "sell.notePlaceholder": {
    vi: "Tình trạng cạnh thẻ, vết xước, cách bảo quản...",
    en: "Edge wear, scratches, storage condition...",
  },
  "sell.submit": { vi: "Đăng bán (phí 0%)", en: "List it (zero fee)" },
  "sell.submitting": { vi: "Đang đăng…", en: "Listing…" },
  "sell.errNoCard": { vi: "Hãy chọn thẻ hoặc thêm mới.", en: "Please pick or add a card." },
  "sell.errNoPhoto": { vi: "Hãy tải lên ảnh thật của thẻ.", en: "Please upload a photo of the actual item." },
  "sell.errSubmit": { vi: "Đăng bán thất bại.", en: "Failed to create listing." },
  "sell.searchCard": {
    vi: "Tìm theo tên thẻ / mã set (VD: Charizard, OP01)",
    en: "Search by card name / set code (e.g. Charizard, OP01)",
  },
  "sell.searchBox": {
    vi: "Tìm theo tên BOX / mã set (VD: 151, OP01)",
    en: "Search by box name / set code (e.g. 151, OP01)",
  },
  "sell.searchEmpty": {
    vi: "Không tìm thấy. Bạn có thể nhập tên để thêm mới.",
    en: "No results. Type a name to add it as new.",
  },

  // ---- Chi tiết listing ----
  "detail.condition": { vi: "Tình trạng", en: "Condition" },
  "detail.quantity": { vi: "Số lượng", en: "Quantity" },
  "detail.quantityValue": { vi: "{n} sản phẩm", en: "{n} pcs" },
  "detail.listedOn": { vi: "Ngày đăng", en: "Listed on" },
  "detail.desc": { vi: "Mô tả", en: "Description" },
  "detail.cancel": { vi: "Gỡ tin đăng", en: "Withdraw listing" },
  "detail.markSold": { vi: "Đã bán · đóng tin", en: "Mark as sold" },
  "detail.markSoldConfirm": {
    vi: "Đóng tin này? Tin sẽ được đánh dấu Đã bán và không hiện trên bảng nữa. Không thể hoàn tác.",
    en: "Close this listing? It will be marked Sold and removed from the board. This cannot be undone.",
  },
  "detail.editPrice": { vi: "Sửa giá", en: "Edit price" },
  "detail.pricePlaceholder": {
    vi: "Để trống = thương lượng",
    en: "Empty = negotiable",
  },
  "detail.viewPrices": { vi: "Xem dữ liệu giá của sản phẩm này", en: "View price data for this item" },
  "detail.photoAlt": { vi: "Ảnh thật của {name}", en: "Photo of {name}" },
  "safety.chat": {
    vi: "Cảnh giác lừa đảo. Tránh trả trước; chỉ giao dịch sau khi đã kiểm tra hiện vật.",
    en: "Watch for scams. Avoid upfront payment; trade only after inspecting the item.",
  },
  "safety.confirm": {
    vi: "Hãy chắc chắn đã nhận và kiểm tra kỹ hiện vật trước khi xác nhận. Xác nhận rồi không thể hoàn tác.",
    en: "Make sure you've received and inspected the item before confirming — this can't be undone.",
  },

  // ---- Seller summary / report ----
  "seller.noRating": { vi: "Chưa có đánh giá", en: "No ratings yet" },
  "seller.ratingCount": { vi: " ({n} đánh giá)", en: " ({n} ratings)" },
  "seller.trades": { vi: "{n} giao dịch hoàn tất", en: "{n} completed trades" },
  "seller.report": { vi: "Báo cáo", en: "Report" },
  "seller.reported": { vi: "Đã ghi nhận báo cáo", en: "Report received" },
  "seller.reportPlaceholder": {
    vi: "Lý do báo cáo (từ 10 ký tự): nghi lừa đảo, vi phạm điều khoản...",
    en: "Reason (10+ chars): suspected fraud, terms violation...",
  },
  "seller.reportHint": {
    vi: "Lý do cần tối thiểu 10 ký tự.",
    en: "Please enter at least 10 characters.",
  },
  "seller.reportSend": { vi: "Gửi báo cáo", en: "Send report" },
  "seller.reportFail": { vi: "Gửi báo cáo thất bại.", en: "Failed to send report." },

  // ---- Purchase requests ----
  "buy.loginPrompt": { vi: "Để gửi yêu cầu mua, hãy", en: "To send a purchase request, please" },
  "buy.loginLink": { vi: "đăng nhập", en: "log in" },
  "buy.loginSuffix": { vi: ".", en: "." },
  "buy.send": { vi: "Gửi yêu cầu mua", en: "Send purchase request" },
  "buy.sent": {
    vi: "✓ Đã gửi yêu cầu mua — khi người bán kết nối, chat riêng sẽ mở.",
    en: "✓ Request sent — a private chat opens once the seller connects with you.",
  },
  "buy.connectedCta": { vi: "Đã kết nối — vào chat thương lượng", en: "Connected — open chat" },
  "buy.listTitle": { vi: "Yêu cầu mua", en: "Purchase requests" },
  "buy.listCount": { vi: "({n})", en: "({n})" },
  "buy.none": {
    vi: "Chưa có yêu cầu mua nào. Khi có, danh sách sẽ hiện ở đây.",
    en: "No purchase requests yet. They will appear here.",
  },
  "buy.listingClosed": {
    vi: "Tin đăng này đã ngừng nhận yêu cầu.",
    en: "This listing is no longer accepting requests.",
  },
  "buy.connect": { vi: "Kết nối", en: "Connect" },
  "buy.toChat": { vi: "Vào chat", en: "Open chat" },
  "buy.tradesShort": { vi: "{n} giao dịch", en: "{n} trades" },

  // ---- Comments ----
  "cmt.title": { vi: "Bình luận", en: "Comments" },
  "cmt.none": {
    vi: "Chưa có bình luận. Cứ thoải mái đặt câu hỏi nhé!",
    en: "No comments yet. Feel free to ask a question!",
  },
  "cmt.placeholder": {
    vi: "Viết bình luận (trả giá, hỏi tình trạng...)",
    en: "Write a comment (haggle, ask about condition...)",
  },
  "cmt.post": { vi: "Gửi", en: "Post" },
  "cmt.postFail": { vi: "Gửi bình luận thất bại.", en: "Failed to post." },
  "cmt.loginPrefix": { vi: "Để bình luận, hãy", en: "To comment, please" },

  // ---- Chat ----
  "vip.label": { vi: "Thành viên VIP", en: "VIP member" },
  "chat.loginPrompt": { vi: "Cần đăng nhập để dùng chat.", en: "Log in to use chat." },
  "chat.none": {
    vi: "Chưa có cuộc chat nào. Gửi yêu cầu mua ở tin đăng bạn thích nhé.",
    en: "No chats yet. Send a purchase request on a listing you like.",
  },
  "chat.selectPrompt": { vi: "Chọn một cuộc chat ở danh sách bên trái", en: "Select a chat from the list" },
  "chat.partner": { vi: "Đối phương: {name}", en: "With: {name}" },
  "chat.back": { vi: "Quay lại danh sách chat", en: "Back to chats" },
  "chat.firstMsg": {
    vi: "Gửi tin nhắn đầu tiên để bắt đầu thương lượng.",
    en: "Send the first message to start negotiating.",
  },
  "chat.purgedTitle": {
    vi: "Đoạn chat này đã được xóa",
    en: "This chat has been deleted",
  },
  "chat.purgedDesc": {
    vi: "Tin nhắn tự động xóa 1 ngày sau khi giao dịch và đánh giá hoàn tất. Lịch sử giao dịch và đánh giá vẫn được giữ.",
    en: "Messages are auto-deleted 1 day after the trade and mutual rating complete. Trade history and ratings are kept.",
  },
  "chat.placeholder": { vi: "Nhập tin nhắn…", en: "Type a message…" },
  "chat.send": { vi: "Gửi", en: "Send" },
  "chat.sendFail": { vi: "Gửi tin nhắn thất bại. Vui lòng thử lại.", en: "Failed to send. Please try again." },

  // ---- Trade panel ----
  "trade.meetFirst": {
    vi: "🤝 Hãy gặp mặt trực tiếp và hoàn tất giao dịch rồi mới bấm chốt giá và đánh giá.",
    en: "🤝 Meet in person and complete the exchange first — then report the final price and rate.",
  },
  "trade.explain": {
    vi: "Khi đã chốt kèo, nhập giá chốt và báo hoàn tất. Đối phương xác nhận cùng số tiền thì dữ liệu giá được ghi nhận (trao đổi thẻ thì nhập giá trị quy đổi).",
    en: "Once you have a deal, enter the final price and report completion. When the other party confirms the same amount, it's recorded as price data (for swaps, enter the equivalent value).",
  },
  "trade.pricePlaceholder": { vi: "Giá chốt (¥)", en: "Final price (JPY)" },
  "trade.report": { vi: "Báo hoàn tất giao dịch", en: "Report completion" },
  "trade.reportedAmount": { vi: "Đã khai giá: {price}", en: "Reported amount: {price}" },
  "trade.incomingReport": { vi: "Có báo cáo hoàn tất giao dịch", en: "A completion report has arrived" },
  "trade.waiting": {
    vi: "Đang chờ đối phương xác nhận. Nếu đến {date} không phản hồi, giao dịch tự chốt dạng tự khai.",
    en: "Waiting for the other party. If not confirmed by {date}, it auto-completes as self-reported.",
  },
  "trade.confirmExplain": {
    vi: "Đối phương đã báo hoàn tất. Hãy tự nhập số tiền hai bên đã thỏa thuận để xác nhận (khớp giá thì giao dịch chốt).",
    en: "The other party reported completion. Enter the agreed amount to confirm (it completes when the amounts match).",
  },
  "trade.confirm": { vi: "Xác nhận", en: "Confirm" },
  "trade.cancel": { vi: "Hủy giao dịch", en: "Cancel trade" },
  "trade.done": { vi: "Đã chốt: {price}", en: "Completed: {price}" },
  "trade.thanks": {
    vi: "🎉 Cảm ơn bạn đã đóng góp dữ liệu! Bạn đã mở khóa xem dữ liệu giá.",
    en: "🎉 Thanks for contributing data! Price data is now unlocked for you.",
  },
  "trade.viewPrices": { vi: "Xem giá thẻ này", en: "View this card's prices" },

  // ---- Rating ----
  "rate.title": { vi: "Đánh giá giao dịch (2 chiều)", en: "Trade rating (mutual)" },
  "rate.aria": { vi: "Đánh giá", en: "Rating" },
  "rate.commentPlaceholder": { vi: "Nhận xét (không bắt buộc)", en: "Comment (optional)" },
  "rate.submit": { vi: "Gửi đánh giá", en: "Submit rating" },
  "rate.fail": { vi: "Gửi đánh giá thất bại.", en: "Failed to submit rating." },
  "rate.blindNote": {
    vi: "Đánh giá được giữ kín đến khi cả hai bên đều đánh giá (chống trả đũa).",
    en: "Ratings stay hidden until both sides have rated (prevents retaliation).",
  },
  "rate.required": {
    vi: "⭐ Đánh giá sau giao dịch là bắt buộc. Vui lòng đánh giá đối phương.",
    en: "⭐ Rating after a trade is required. Please rate your partner.",
  },
  "rate.doneWaiting": { vi: "✓ Đã đánh giá ({stars}) — sẽ công khai khi đối phương đánh giá xong.", en: "✓ Rated ({stars}) — revealed once the other party rates too." },
  "rate.mine": { vi: "Đánh giá của bạn:", en: "Your rating:" },
  "rate.theirs": { vi: "Đối phương đánh giá:", en: "Their rating:" },

  // ---- Prices ----
  "price.allConditions": { vi: "Mọi tình trạng", en: "All conditions" },
  "price.note": {
    vi: "※ Chỉ hiển thị giá chốt thực tế (không phải giá rao). Người giao dịch được ẩn danh. Mục có ⚠ là giá lệch bất thường, đã loại khỏi thống kê & biểu đồ.",
    en: "※ Actual sale prices only (not asking prices). Parties are anonymous. ⚠ marks outliers excluded from stats & chart.",
  },
  "price.count": { vi: "Số giao dịch", en: "Sales" },
  "price.median": { vi: "Trung vị", en: "Median" },
  "price.min": { vi: "Thấp nhất", en: "Lowest" },
  "price.max": { vi: "Cao nhất", en: "Highest" },
  "price.thDate": { vi: "Ngày chốt", en: "Date" },
  "price.thCondition": { vi: "Tình trạng", en: "Condition" },
  "price.thPrice": { vi: "Giá chốt", en: "Price" },
  "price.thReliability": { vi: "Độ tin cậy", en: "Reliability" },
  "price.noData": { vi: "Chưa có dữ liệu giá cho điều kiện này.", en: "No sale data for this filter yet." },
  "price.chartNeed": { vi: "Cần từ 2 giao dịch để vẽ biểu đồ.", en: "At least 2 data points are needed for the chart." },
  "price.chartAria": { vi: "Biểu đồ diễn biến giá chốt", en: "Sale price trend chart" },
  "price.flagTip": { vi: "Nghi giá bất thường — đã loại khỏi thống kê/biểu đồ", en: "Possible outlier — excluded from stats/chart" },
  "lock.title": { vi: "Dữ liệu giá mở khóa theo cơ chế Give-to-Get", en: "Price data unlocks via Give-to-Get" },
  "lock.desc": {
    vi: "Sản phẩm này đang có {n} giao dịch được ghi nhận. Để xem, hãy hoàn tất ít nhất 1 giao dịch để đóng góp dữ liệu.",
    en: "This item has {n} recorded sales. Complete at least 1 trade to contribute data and unlock viewing.",
  },
  "lock.note": {
    vi: "DEAL miễn phí hoàn toàn — đổi lại, cộng đồng cùng đóng góp giá chốt thật để xây mặt bằng giá minh bạch.",
    en: "DEAL is zero-fee. In return, everyone contributes real sale prices to build transparent market data.",
  },
  "lock.ctaBrowse": { vi: "Tìm tin đăng và bắt đầu giao dịch", en: "Browse listings and start trading" },
  "lock.ctaRegister": { vi: "Đăng ký miễn phí để bắt đầu", en: "Sign up free to get started" },

  // ---- Giá tham khảo (nguồn ngoài) ----
  "refprice.title": { vi: "Giá tham khảo thị trường", en: "Market reference prices" },
  "refprice.source": { vi: "Nguồn: {source}", en: "Source: {source}" },
  "refprice.disclaimer": {
    vi: "※ Giá tham khảo do DEAL thu thập từ nguồn ngoài, KHÔNG phải giao dịch trên DEAL. Chỉ để tham khảo mặt bằng giá.",
    en: "※ Reference prices collected by DEAL from external sources — NOT trades on DEAL. For price-level reference only.",
  },
  "refprice.count": { vi: "Số lần ghi nhận", en: "Data points" },
  "refprice.weightedAvg": { vi: "TB có trọng số", en: "Weighted avg" },
  "refprice.totalQty": { vi: "Tổng số lượng", en: "Total quantity" },
  "refprice.thDate": { vi: "Thời điểm", en: "Recorded" },
  "refprice.thQuantity": { vi: "Số lượng", en: "Quantity" },
  "refprice.thPrice": { vi: "Đơn giá", en: "Unit price" },
  "refprice.thNote": { vi: "Ghi chú", en: "Note" },
  "refprice.unit": { vi: "{n} pack", en: "{n} packs" },
  "refprice.noData": { vi: "Chưa có giá tham khảo cho sản phẩm này.", en: "No reference prices for this item yet." },
  "refprice.chartAria": { vi: "Biểu đồ giá tham khảo", en: "Reference price trend chart" },

  // ---- Trang cá nhân ----
  "me.loginPrompt": { vi: "Cần đăng nhập để xem trang cá nhân.", en: "Log in to view your page." },
  "me.contribution": { vi: "Số lần đóng góp dữ liệu", en: "Data contributions" },
  "me.canView": { vi: "✓ Được xem dữ liệu giá", en: "✓ Price data unlocked" },
  "me.locked": { vi: "🔒 Hoàn tất 1 giao dịch để mở khóa giá", en: "🔒 Complete 1 trade to unlock prices" },
  "me.noRatingYet": { vi: "Chưa có đánh giá (công khai sau khi 2 bên đánh giá)", en: "No ratings (revealed after mutual rating)" },
  "me.saved": { vi: "Đã lưu", en: "Saved" },
  "me.savedEmpty": {
    vi: "Chưa lưu tin nào. Bấm ❤️ trên tin để lưu lại xem sau.",
    en: "Nothing saved yet. Tap ❤️ on a listing to save it for later.",
  },
  "fav.add": { vi: "Lưu", en: "Save" },
  "fav.remove": { vi: "Bỏ lưu", en: "Remove from saved" },
  "fav.save": { vi: "Lưu", en: "Save" },
  "fav.saved": { vi: "Đã lưu", en: "Saved" },
  "fav.removeShort": { vi: "Bỏ lưu", en: "Remove" },
  "fav.gone": { vi: "Sản phẩm này không còn", en: "This listing is no longer available" },
  "fav.goneHint": {
    vi: "Đã bán / gỡ / hủy",
    en: "Sold, removed, or cancelled",
  },
  "me.activity": { vi: "Hoạt động mới", en: "Activity" },
  "me.activityEmpty": {
    vi: "Chưa có thông báo nào. Khi có bình luận hoặc yêu cầu mua vào tin của bạn, chúng sẽ hiện ở đây.",
    en: "No notifications yet. Comments and purchase requests on your listings will appear here.",
  },
  "me.actComment": {
    vi: "đã bình luận vào tin “{card}”",
    en: "commented on “{card}”",
  },
  "me.actRequest": {
    vi: "muốn mua “{card}”",
    en: "wants to buy “{card}”",
  },
  "me.actOffer": {
    vi: "chào bán {n} thẻ vào tin đăng mua “{card}”",
    en: "offered {n} for your buy order “{card}”",
  },
  "me.actNew": { vi: "Mới", en: "New" },

  // ---- Thông báo đẩy (Web Push) ----
  "push.title": { vi: "Thông báo trên điện thoại", en: "Phone notifications" },
  "push.hint": {
    vi: "Nhận thông báo tin nhắn và hoạt động ngay trên màn hình điện thoại, kể cả khi không mở web.",
    en: "Get message and activity alerts on your phone screen, even when the site is closed.",
  },
  "push.enable": { vi: "Bật thông báo", en: "Enable notifications" },
  "push.disable": { vi: "Tắt thông báo", en: "Disable notifications" },
  "push.enabled": { vi: "✓ Đang bật trên thiết bị này", en: "✓ On for this device" },
  "push.working": { vi: "Đang xử lý…", en: "Working…" },
  "push.perDevice": {
    vi: "Cài đặt này áp dụng cho riêng thiết bị bạn đang dùng.",
    en: "This setting applies to the device you're using now.",
  },
  "push.denied": {
    vi: "Bạn đã chặn thông báo cho trang này. Mở Cài đặt của trình duyệt và cho phép thông báo với DEAL, rồi thử lại.",
    en: "You've blocked notifications for this site. Allow notifications for DEAL in your browser settings, then try again.",
  },
  "push.failed": {
    vi: "Không bật được thông báo. Vui lòng thử lại.",
    en: "Couldn't enable notifications. Please try again.",
  },
  "push.unsupported": {
    vi: "Trình duyệt này không hỗ trợ thông báo đẩy.",
    en: "This browser doesn't support push notifications.",
  },
  // iOS: Apple CHỈ cho phép push khi web đã được cài ra màn hình chính.
  "push.iosTitle": { vi: "Cần thêm 1 bước trên iPhone", en: "One extra step on iPhone" },
  "push.iosHint": {
    vi: "iPhone chỉ cho phép thông báo khi DEAL được cài vào màn hình chính. Ở Safari, bấm nút Chia sẻ (ô vuông có mũi tên) → “Thêm vào MH chính” → mở DEAL từ biểu tượng vừa tạo, rồi quay lại đây bật thông báo.",
    en: "iPhone only allows notifications once DEAL is added to your home screen. In Safari, tap Share (square with an arrow) → “Add to Home Screen” → open DEAL from the new icon, then come back here to enable.",
  },

  "me.trades": { vi: "Lịch sử giao dịch", en: "Trade history" },
  "me.noTrades": { vi: "Chưa có giao dịch nào.", en: "No trades yet." },
  "me.listings": { vi: "Tin đăng của tôi", en: "My listings" },
  "me.noListings": { vi: "Chưa có tin đăng nào.", en: "No listings yet." },
  "me.with": { vi: "với {name} · ", en: "with {name} · " },

  // ---- Verify banner / verify page ----
  "banner.msg": {
    vi: " — hãy kiểm tra email xác nhận. Chưa xác nhận thì không thể đăng bán / mua / bình luận.",
    en: " — please check your verification email. You can't sell, buy or comment until verified.",
  },
  "banner.resend": { vi: "Gửi lại email xác nhận", en: "Resend verification email" },
  "banner.resent": { vi: "✓ Đã gửi lại", en: "✓ Sent" },
  "banner.resendFail": {
    vi: "Gửi lại thất bại. Vui lòng thử lại sau.",
    en: "Failed to resend. Please try again later.",
  },
  "verify.working": { vi: "Đang xác nhận…", en: "Verifying…" },
  "verify.okTitle": { vi: "Đã xác nhận email thành công", en: "Email verified" },
  "verify.okDesc": {
    vi: "Giờ bạn dùng được mọi tính năng: đăng bán, mua, bình luận…",
    en: "You can now use all features: selling, buying, commenting…",
  },
  "verify.okCta": { vi: "Khám phá tin đăng ngay", en: "Browse listings now" },
  "verify.errTitle": { vi: "Xác nhận thất bại", en: "Verification failed" },
  "verify.badLink": { vi: "Đường link không hợp lệ.", en: "Invalid link." },
  "verify.home": { vi: "Về trang chủ", en: "Back to home" },

  // ---- Forgot / reset ----
  "forgot.title": { vi: "Quên mật khẩu?", en: "Forgot your password?" },
  "forgot.desc": {
    vi: "Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.",
    en: "Enter your registered email and we'll send a reset link.",
  },
  "forgot.submit": { vi: "Gửi link đặt lại", en: "Send reset link" },
  "forgot.sentTitle": { vi: "Đã gửi email", en: "Email sent" },
  "forgot.sentDesc": {
    vi: " — link đặt lại mật khẩu đã được gửi (nếu email có đăng ký). Link có hạn 1 giờ.",
    en: " — a reset link was sent (if the email is registered). The link expires in 1 hour.",
  },
  "forgot.back": { vi: "Quay lại đăng nhập", en: "Back to log in" },
  "forgot.fail": { vi: "Gửi thất bại.", en: "Failed to send." },
  "reset.title": { vi: "Đặt mật khẩu mới", en: "Set a new password" },
  "reset.new": { vi: "Mật khẩu mới (từ 8 ký tự)", en: "New password (8+ characters)" },
  "reset.confirm": { vi: "Nhập lại mật khẩu mới", en: "Confirm new password" },
  "reset.mismatch": { vi: "Mật khẩu không khớp.", en: "Passwords don't match." },
  "reset.submit": { vi: "Đổi mật khẩu", en: "Change password" },
  "reset.submitting": { vi: "Đang đổi…", en: "Changing…" },
  "reset.doneTitle": { vi: "Đã đổi mật khẩu", en: "Password changed" },
  "reset.doneDesc": {
    vi: "Đã đăng xuất khỏi mọi thiết bị. Hãy đăng nhập bằng mật khẩu mới.",
    en: "All devices have been logged out. Log in with your new password.",
  },
  "reset.badLink": {
    vi: "Link không hợp lệ. Hãy truy cập từ link trong email.",
    en: "Invalid link. Please use the link from the email.",
  },
  "reset.fail": { vi: "Đặt lại thất bại.", en: "Reset failed." },

  // ---- Terms gate ----
  "gate.title": { vi: "Vui lòng đồng ý Điều khoản sử dụng", en: "Please accept the Terms of Service" },
  "gate.desc": {
    vi: "Để tiếp tục dùng DEAL, bạn cần đồng ý Điều khoản sử dụng và Chính sách bảo mật mới nhất.",
    en: "To keep using DEAL, you need to accept the latest Terms of Service and Privacy Policy.",
  },
  "gate.point1": {
    vi: "· DEAL chỉ cung cấp nơi kết nối, không phải một bên mua/bán",
    en: "· DEAL only provides the marketplace and is not a party to trades",
  },
  "gate.point2": {
    vi: "· Thanh toán và giao nhận do hai bên tự chịu trách nhiệm",
    en: "· Payment and delivery are the users' own responsibility",
  },
  "gate.point3": {
    vi: "· Giá chốt được ẩn danh và công khai làm dữ liệu thị trường",
    en: "· Sale prices are anonymized and published as market data",
  },
  "gate.fulltext": { vi: "Bản đầy đủ:", en: "Full text:" },
  "gate.agreeLabel": {
    vi: "Tôi đã đọc và đồng ý với Điều khoản sử dụng và Chính sách bảo mật",
    en: "I have read and agree to the Terms of Service and Privacy Policy",
  },
  "gate.accept": { vi: "Đồng ý và tiếp tục", en: "Accept and continue" },

  // ---- Đăng mua (tin của người MUỐN MUA; người bán vào chào bán) ----
  "nav.buyOrders": { vi: "Đăng mua", en: "Post a buy request" },
  "chat.buyOrderTag": { vi: "Đăng mua", en: "Buy request" },
  "chat.buyOrderQty": { vi: "Cần {n}", en: "Wants {n}" },
  // Bảng tin
  "bo.title": { vi: "Đăng mua", en: "Buy requests" },
  "bo.desc": {
    vi: "Tin của người đang muốn mua. Có hàng khớp thì bạn chào bán.",
    en: "Posts from people looking to buy. Got a match? Make an offer.",
  },
  "bo.create": { vi: "Đăng mua", en: "Post a buy request" },
  "bo.searchPlaceholder": {
    vi: "Tìm theo tên thẻ / set / số",
    en: "Search by card name / set / number",
  },
  "bo.count": { vi: "{n} tin đăng mua", en: "{n} buy requests" },
  "bo.empty": { vi: "Chưa có tin đăng mua nào.", en: "No buy requests yet." },
  "bo.emptySearch": {
    vi: "Không có tin đăng mua nào khớp \"{q}\".",
    en: "No requests match \"{q}\".",
  },
  "bo.wants": { vi: "Cần {n} bản", en: "Wants {n}" },
  "bo.maxUnit": { vi: "Tối đa {price}/bản", en: "Max {price}/ea" },
  "bo.noMaxPrice": { vi: "Đơn giá thương lượng", en: "Unit price negotiable" },
  "bo.offerCount": { vi: "{n} chào bán", en: "{n} offers" },
  // Form tạo tin
  "bon.title": { vi: "Đăng tin mua", en: "Post a buy request" },
  "bon.game": { vi: "Trò chơi", en: "Game" },
  "bon.category": { vi: "Loại", en: "Category" },
  "bon.selectCard": { vi: "Thẻ cần mua", en: "Card to buy" },
  "bon.selectBox": { vi: "BOX cần mua", en: "Box to buy" },
  "bon.selectOther": { vi: "Sản phẩm cần mua", en: "Product to buy" },
  "bon.quantity": { vi: "Số lượng cần", en: "Quantity wanted" },
  "bon.maxPrice": { vi: "Đơn giá tối đa (tùy chọn)", en: "Max unit price (optional)" },
  "bon.maxPriceExample": { vi: "VD: 5000 (tối đa mỗi bản)", en: "e.g. 5000 (per unit)" },
  "bon.photo": { vi: "Ảnh minh họa (tùy chọn, tối đa 5MB)", en: "Reference photo (optional, max 5MB)" },
  "bon.photoHint": {
    vi: "Ảnh mẫu thẻ/BOX bạn muốn mua giúp người bán nhận ra đúng món.",
    en: "A sample photo of the card/box you want helps sellers recognize it.",
  },
  "bon.photoPreviewAlt": { vi: "Xem trước ảnh tải lên", en: "Upload preview" },
  "bon.removePhoto": { vi: "Bỏ ảnh", en: "Remove photo" },
  "bon.submit": { vi: "Đăng tin", en: "Post request" },
  "bon.submitting": { vi: "Đang gửi…", en: "Submitting…" },
  "bon.loginPrompt": {
    vi: "Cần đăng nhập để đăng tin mua.",
    en: "Log in to post a request.",
  },
  "bon.errNoCard": { vi: "Vui lòng chọn thẻ.", en: "Please select a card." },
  "bon.errSubmit": { vi: "Đăng tin thất bại.", en: "Failed to post request." },
  // Trang chi tiết tin
  "bod.quantity": { vi: "Số lượng cần", en: "Quantity wanted" },
  "bod.quantityValue": { vi: "{n} bản", en: "{n} pcs" },
  "bod.maxPrice": { vi: "Đơn giá tối đa", en: "Max unit price" },
  "bod.listedOn": { vi: "Ngày đăng", en: "Posted on" },
  "bod.cancel": { vi: "Gỡ tin đăng mua", en: "Withdraw request" },
  "bod.cancelled": { vi: "Tin đăng mua đã đóng.", en: "This request is closed." },
  "bod.offers": { vi: "Danh sách chào bán", en: "Offers" },
  "bod.noOffers": {
    vi: "Chưa có chào bán nào.",
    en: "No offers yet.",
  },
  "bod.offerFormTitle": { vi: "Chào bán cho tin này", en: "Offer to sell" },
  "bod.offerQuantity": { vi: "Số lượng bán được", en: "Quantity you can sell" },
  "bod.offerMessage": { vi: "Lời nhắn (tùy chọn)", en: "Message (optional)" },
  "bod.offerMessagePlaceholder": {
    vi: "Tình trạng, giá, cách giao nhận…",
    en: "Condition, price, delivery…",
  },
  "bod.offerSubmit": { vi: "Gửi chào bán", en: "Submit offer" },
  "bod.offerSubmitting": { vi: "Đang gửi…", en: "Submitting…" },
  "bod.offerQtyLabel": { vi: "Bán được {n} bản", en: "Can sell {n}" },
  "bod.connect": { vi: "Kết nối người này", en: "Connect" },
  "bod.openChat": { vi: "Mở chat", en: "Open chat" },
  "bod.ownOrder": { vi: "Đây là tin của bạn.", en: "This is your request." },
  "bod.loginToOffer": {
    vi: "Cần đăng nhập để chào bán.",
    en: "Log in to make an offer.",
  },
  "bod.alreadyOffered": { vi: "Đã chào bán", en: "Offer submitted" },
  // Trade từ tin gom (đơn giá × số lượng + condition khai lúc chốt)
  "trade.unitPricePlaceholder": { vi: "Đơn giá (¥/bản)", en: "Unit price (JPY/ea)" },
  "trade.qtyPlaceholder": { vi: "Số lượng", en: "Qty" },
  "trade.conditionLabel": { vi: "Tình trạng", en: "Condition" },
  "trade.boExplain": {
    vi: "Sau khi giao dịch xong, hãy khai đơn giá, số lượng và tình trạng. Đối phương xác nhận thì đơn giá được ghi vào dữ liệu thị trường.",
    en: "After completing the deal, report unit price, quantity and condition. Once confirmed, the unit price is recorded as market data.",
  },
  "trade.boReported": {
    vi: "Đã khai: {price}/bản × {n} ({cond})",
    en: "Reported: {price}/ea × {n} ({cond})",
  },
  "trade.boConfirmExplain": {
    vi: "Đối phương báo đã hoàn tất giao dịch (tình trạng: {cond}). Hãy tự nhập đơn giá và số lượng để xác nhận.",
    en: "The other party reported completion (condition: {cond}). Enter the unit price and quantity yourself to confirm.",
  },
  "trade.boDone": {
    vi: "Đã chốt: {price}/bản × {n}",
    en: "Completed: {price}/ea × {n}",
  },

  // ---- Hồ sơ công khai & hệ tin cậy (P10) ----
  "seller.viewProfile": { vi: "Xem hồ sơ", en: "View profile" },
  "me.viewPublicProfile": {
    vi: "Xem hồ sơ công khai của tôi",
    en: "View my public profile",
  },
  "profile.memberSince": { vi: "Tham gia từ {date}", en: "Member since {date}" },
  "profile.level": { vi: "Lv.{n}", en: "Lv.{n}" },
  "profile.xpBar": { vi: "XP {cur} / {next}", en: "XP {cur} / {next}" },
  "profile.trustScore": { vi: "Điểm tin cậy", en: "Trust Score" },
  "profile.trustScoreHint": {
    vi: "Tự động tính từ lịch sử giao dịch, đánh giá, tuổi tài khoản và vi phạm (0–100)",
    en: "Computed from trade history, ratings, account age and violations (0–100)",
  },
  "profile.tier.bronze": { vi: "🥉 Bronze Trainer", en: "🥉 Bronze Trainer" },
  "profile.tier.silver": { vi: "🥈 Silver Trainer", en: "🥈 Silver Trainer" },
  "profile.tier.gold": { vi: "🥇 Gold Trainer", en: "🥇 Gold Trainer" },
  "profile.tier.platinum": { vi: "💎 Platinum Trainer", en: "💎 Platinum Trainer" },
  "profile.tier.master": { vi: "👑 Master Trainer", en: "👑 Master Trainer" },
  "profile.tier.legendary": { vi: "🌈 Legendary Trainer", en: "🌈 Legendary Trainer" },
  "profile.stats.title": { vi: "Thống kê giao dịch", en: "Trading statistics" },
  "profile.stats.closed": { vi: "Giao dịch hoàn tất", en: "Completed trades" },
  "profile.stats.partners": { vi: "Số đối tác", en: "Trade partners" },
  "profile.stats.completion": { vi: "Tỷ lệ hoàn thành", en: "Completion rate" },
  "profile.stats.cancelled": { vi: "Đã hủy", en: "Cancelled" },
  "profile.badges.title": { vi: "Huy hiệu", en: "Badges" },
  "profile.badges.empty": {
    vi: "Chưa có huy hiệu nào. Giao dịch thêm để nhận nhé.",
    en: "No badges yet. Keep trading to earn them.",
  },
  "badge.trades10": { vi: "🏆 10 giao dịch", en: "🏆 10 Trades" },
  "badge.trades100": { vi: "🏆 100 giao dịch", en: "🏆 100 Trades" },
  "badge.trades500": { vi: "🏆 500 giao dịch", en: "🏆 500 Trades" },
  "badge.topSeller": { vi: "⭐ Top Seller", en: "⭐ Top Seller" },
  "badge.trustedTrader": { vi: "🛡 Trader uy tín", en: "🛡 Trusted Trader" },
  "badge.perfectRating": { vi: "🎯 Đánh giá tuyệt đối", en: "🎯 Perfect Rating" },
  "badge.noReport": { vi: "🔥 Không vi phạm", en: "🔥 No Report" },
  "badge.oneYear": { vi: "🎂 Thành viên 1 năm", en: "🎂 One Year Member" },
  "profile.reviews.title": { vi: "Đánh giá gần đây", en: "Recent reviews" },
  "profile.reviews.empty": {
    vi: "Chưa có đánh giá nào.",
    en: "No reviews yet.",
  },
  "profile.listings.title": { vi: "Đang bán", en: "Active listings" },
  "profile.listings.empty": {
    vi: "Hiện không có tin đang bán.",
    en: "No active listings.",
  },
  "profile.safety.title": { vi: "Trust & Safety", en: "Trust & Safety" },
  "profile.safety.green": {
    vi: "🟢 Không có báo cáo vi phạm",
    en: "🟢 No issues reported",
  },
  "profile.safety.yellow": {
    vi: "🟡 Đang có báo cáo được xem xét. Hãy kiểm tra kỹ thông tin trước khi giao dịch (chưa phải kết luận vi phạm).",
    en: "🟡 Reports under review. Please double-check before trading (not a confirmed violation).",
  },
  "profile.safety.red": {
    vi: "🔴 Tài khoản từng vi phạm quy định đã được xác minh ({n} lần). Hãy cân nhắc kỹ trước khi giao dịch.",
    en: "🔴 This account has verified violations ({n}). Trade with caution.",
  },
  "profile.safety.lastViolation": {
    vi: "Vi phạm gần nhất xác minh ngày: {date}",
    en: "Last verified violation: {date}",
  },
  "profile.notFound": {
    vi: "Không tìm thấy người dùng.",
    en: "User not found.",
  },
  "trade.safetyWarnYellow": {
    vi: "🟡 Đối phương đang có báo cáo được xem xét. Hãy kiểm tra kỹ trước khi chốt.",
    en: "🟡 Your counterpart has reports under review. Double-check before closing the deal.",
  },
  "trade.safetyWarnRed": {
    vi: "🔴 Đối phương từng vi phạm đã xác minh ({n} lần · điểm tin cậy {score}). Cân nhắc kỹ trước khi tiếp tục.",
    en: "🔴 Your counterpart has verified violations ({n} · trust score {score}). Proceed at your own discretion.",
  },
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof MESSAGES;
