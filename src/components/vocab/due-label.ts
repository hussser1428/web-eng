const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

/** Nhãn ngắn cho hạn ôn của một từ. `now` truyền từ ngoài vào để server và client hiện giống nhau. */
export function dueLabel(dueAt: string, now: Date): string {
  const soNgay = Math.ceil((new Date(dueAt).getTime() - now.getTime()) / MS_MOT_NGAY);
  if (soNgay <= 0) return "Đến hạn";
  if (soNgay === 1) return "Còn 1 ngày";
  return `Còn ${soNgay} ngày`;
}
