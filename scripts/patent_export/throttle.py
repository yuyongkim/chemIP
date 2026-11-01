"""Be polite to a machine that serves a live site: idle CPU priority, low I/O priority, read-rate cap.

Windows "background mode" (PROCESS_MODE_BACKGROUND_BEGIN) is deliberately NOT used: it also lowers memory
priority, the working set got trimmed to ~30 MB and the scan ran ~5x slower on page faults.
"""
import ctypes
import os
import time

_IDLE_PRIORITY_CLASS = 0x00000040
_PROCESS_IO_PRIORITY = 33          # PROCESSINFOCLASS.ProcessIoPriority
_IO_PRIORITY_LOW = 1


def lower_priority():
    """Idle CPU class + low I/O priority (Windows) or nice 19 (POSIX). Returns a label."""
    if os.name != "nt":
        os.nice(19)
        return "nice19"
    k32 = ctypes.windll.kernel32
    k32.GetCurrentProcess.restype = ctypes.c_void_p            # 64-bit pseudo-handle, not a C int
    k32.SetPriorityClass.argtypes = (ctypes.c_void_p, ctypes.c_uint32)
    h = k32.GetCurrentProcess()
    label = "idle" if k32.SetPriorityClass(h, _IDLE_PRIORITY_CLASS) else "normal"
    ntdll = ctypes.windll.ntdll
    ntdll.NtSetInformationProcess.argtypes = (ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_ulong)
    io = ctypes.c_ulong(_IO_PRIORITY_LOW)
    if ntdll.NtSetInformationProcess(h, _PROCESS_IO_PRIORITY, ctypes.byref(io), ctypes.sizeof(io)) == 0:
        label += "+io_low"
    return label


class RateLimitedReader:
    """Read-only file-like wrapper that sleeps so the average read rate stays under max_bytes_per_s."""

    def __init__(self, raw, max_bytes_per_s):
        self.raw, self.rate = raw, max_bytes_per_s
        self.read_bytes, self.t0 = 0, time.monotonic()

    def read(self, n=-1):
        data = self.raw.read(n)
        self.read_bytes += len(data)
        if self.rate:
            ahead = self.read_bytes / self.rate - (time.monotonic() - self.t0)
            if ahead > 0.05:
                time.sleep(ahead)
        return data

    def readable(self):
        return True

    def close(self):
        self.raw.close()
