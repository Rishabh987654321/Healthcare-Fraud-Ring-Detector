import time
import logging

logger = logging.getLogger(__name__)


class PerformanceLoggingMiddleware:
    """
    Middleware that measures total HTTP response processing time and logs performance metrics.
    Adds 'X-Response-Time-Ms' header to responses for performance verification.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.perf_counter()
        
        response = self.get_response(request)
        
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Log performance timing for API requests
        if request.path.startswith('/api/'):
            logger.info(
                f"[PERF] {request.method} {request.get_full_path()} -> "
                f"Status {response.status_code} in {duration_ms:.2f}ms"
            )
            response['X-Response-Time-Ms'] = f"{duration_ms:.2f}"
            
        return response
