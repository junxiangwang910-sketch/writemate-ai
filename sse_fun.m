function phi = sse_fun(k, t, yobs)
k1 = k(1);
k2 = k(2);

if k1 <= 0 || k2 <= 0 || abs(k1-k2) < 1e-6
    phi = 1e12;
    return;
end

yp = ypred_fun(k1, k2, t);
phi = sum((yobs - yp).^2);
end
