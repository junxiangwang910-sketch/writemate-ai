clear; clc; close all;

%% Homework 2
% Part A: choose a starting point from the contour plot
% Part B: estimate k1 and k2 from least squares

%% Part A
figure(1);
drawfun2d;
colormap(parula);

x = 0:0.01:4;
y = -1:0.01:1.5;
z = zeros(length(y), length(x));

for j = 1:length(y)
    for i = 1:length(x)
        z(j,i) = obj(x(i), y(j));
    end
end

[zmax0, idxmax] = max(z(:));
[rowmax, colmax] = ind2sub(size(z), idxmax);
x0max = x(colmax);
y0max = y(rowmax);

[zmin0, idxmin] = min(z(:));
[rowmin, colmin] = ind2sub(size(z), idxmin);
x0min = x(colmin);
y0min = y(rowmin);

plot(x0max, y0max, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 12);
plot(x0min, y0min, 'ws', 'MarkerFaceColor', 'k', 'MarkerSize', 8);
legend('f(x,y)', 'start point for max', 'start point for min', 'Location', 'best');

fmax = @(v) -obj(v(1), v(2));
fmin = @(v)  obj(v(1), v(2));

opts = optimset('Display', 'off', 'TolX', 1e-10, 'TolFun', 1e-10);
[vmax, fmax_value] = fminsearch(fmax, [x0max, y0max], opts);
[vmin, fmin_value] = fminsearch(fmin, [x0min, y0min], opts);

plot(vmax(1), vmax(2), 'md', 'MarkerFaceColor', 'c', 'MarkerSize', 10);
plot(vmin(1), vmin(2), 'ko', 'MarkerFaceColor', 'g', 'MarkerSize', 8);

fprintf('Part A\n');
fprintf('Starting point for maximum: (%.4f, %.4f)\n', x0max, y0max);
fprintf('Maximum point found      : (%.6f, %.6f)\n', vmax(1), vmax(2));
fprintf('Maximum value            : %.6f\n', -fmax_value);
fprintf('Starting point for minimum: (%.4f, %.4f)\n', x0min, y0min);
fprintf('Minimum point found      : (%.6f, %.6f)\n', vmin(1), vmin(2));
fprintf('Minimum value            : %.6f\n\n', fmin_value);

%% Part B
t = [0.5; 1.0; 1.5];
yobs = [0.263; 0.455; 0.548];

k0 = [0.6; 0.2];
[kbest, phi_min] = fminsearch(@(k) sse_fun(k, t, yobs), k0, opts);
k1 = kbest(1);
k2 = kbest(2);
yp = ypred_fun(k1, k2, t);

fprintf('Part B\n');
fprintf('Estimated k1 = %.6f\n', k1);
fprintf('Estimated k2 = %.6f\n', k2);
fprintf('Minimum SSE  = %.8f\n\n', phi_min);

disp(table(t, yobs, yp, yobs-yp, ...
    'VariableNames', {'t', 'y_observed', 'y_predicted', 'residual'}));

k1v = 0.05:0.01:1.50;
k2v = 0.05:0.01:1.20;
phi = nan(length(k2v), length(k1v));

for j = 1:length(k2v)
    for i = 1:length(k1v)
        phi(j,i) = sse_fun([k1v(i); k2v(j)], t, yobs);
    end
end

phi_plot = phi;
phi_plot(phi_plot > 0.01) = NaN;

figure(2);
surf(k1v, k2v, phi_plot, 'EdgeColor', 'none');
colormap(turbo);
colorbar;
xlabel('k_1');
ylabel('k_2');
zlabel('\phi');
title('Sum-of-squares surface');
view(135, 30);
hold on;
plot3(k1, k2, phi_min, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 14);

figure(3);
contourf(k1v, k2v, phi_plot, 25, 'LineColor', 'none');
colormap(turbo);
colorbar;
xlabel('k_1');
ylabel('k_2');
title('Contour of sum-of-squares surface');
hold on;
plot(k1, k2, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 12);

figure(4);
contour(k1v, k2v, phi_plot, 20, 'k', 'LineWidth', 1.0);
colorbar;
xlabel('k_1');
ylabel('k_2');
title('Line contour of sum-of-squares surface');
hold on;
plot(k1, k2, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 12);
grid on;
